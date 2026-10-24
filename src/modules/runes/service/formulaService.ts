import {
  Prisma,
  RuneAuditAction,
  RuneDesignStatus,
  RuneOutcome,
} from "../../../database/generated/prisma/client.js";

import prisma from "../../../database/prisma.js";
import { SpellCache } from "../../spells/cache/spellCache.js";
import { SpellMatcher } from "../../spells/lib/spellMatcher.js";
import { Storage } from "../../../lib/storage.js";
import { Mana } from "../../spells/lib/mana.js";
import { SpellService } from "../../spells/service/spellService.js";
import { RUNE_MAX_MASTERY } from "../lib/runeCatalog.js";
import { FORMULA_OUTCOMES, RuneRules } from "../lib/runeRules.js";
import { RuneAudit } from "./runeAudit.js";
import { RuneError, RuneRegistry } from "./runeRegistry.js";
import { RuneService } from "./runeService.js";

const FORMULA_INCLUDE = {
  spell: true,
  rune: true,
  authorCharacter: { select: { id: true, rpName: true } },
} satisfies Prisma.SpellFormulaInclude;

export type FormulaWithRelations = Prisma.SpellFormulaGetPayload<{ include: typeof FORMULA_INCLUDE }>;


export type FormulaDraft = {
  spellQuery: string;
  runeKey: string;
  incantation: string;
  effect: string;
  mechanics?: string;
  restrictions?: string;
};

export type FormulaReview = {
  minMastery: string;
  baseRisk: string;
  complexity: string;
  failureOutcome: string;
};

export type AvailableFormula = {
  formula: FormulaWithRelations;
  mastery: number;
  risk: number;
  allowed: boolean;
};

export class FormulaService {
  public static async findSpell(query: string) {
    await SpellService.ensureCache();

    const text = SpellMatcher.normalize(query);

    if (text.length < 2) {
      throw new RuneError("Укажите базовое заклинание: название или формулу.");
    }

    const spell = SpellCache.all().find(
      (entry) =>
        SpellMatcher.normalize(entry.name) === text ||
        entry.incantations.some((incantation) => SpellMatcher.normalize(incantation) === text),
    );

    if (!spell) {
      throw new RuneError(`Базовое заклинание «${query.trim()}» не найдено. Сначала его нужно добавить в /manage → Заклинания.`);
    }

    return spell;
  }

  public static async syncSpell(formulaId: string) {
    await SpellService.ensureCache();

    const formula = await prisma.spellFormula.findUnique({
      where: { id: formulaId },
      include: { spell: true, rune: true, registeredSpell: true },
    });

    if (!formula) {
      return null;
    }

    const registered = formula.registeredSpell;

    if (formula.status !== RuneDesignStatus.APPROVED) {
      if (registered) {
        await prisma.spell.delete({ where: { id: registered.id } });
        SpellCache.remove(registered.id);
        await Promise.all(registered.gifPaths.map((path) => Storage.delete(path)));
      }

      return null;
    }

    const base = formula.spell;
    const gifQuery =
      base.gifQuery ?? base.incantations.find((incantation) => /^[a-z\s']+$/i.test(incantation)) ?? base.name;

    const data = {
      name: `${base.name} · ${formula.rune.name}`.slice(0, 80),
      incantations: [formula.incantation],
      description: formula.effect.slice(0, 1000),
      difficulty: base.difficulty,
      manaCost: base.manaCost ?? Mana.spellCost(base),
      gifQuery,
      isCustom: true,
    };

    const spell = await prisma.spell.upsert({
      where: { formulaId: formula.id },
      create: { ...data, formulaId: formula.id },
      update: data,
    });

    SpellCache.update(spell);

    return spell;
  }

  public static async syncAll() {
    const formulas = await prisma.spellFormula.findMany({
      where: {
        OR: [
          { status: RuneDesignStatus.APPROVED, registeredSpell: null },
          { status: { not: RuneDesignStatus.APPROVED }, registeredSpell: { isNot: null } },
        ],
      },
      select: { id: true },
    });

    for (const formula of formulas) {
      await this.syncSpell(formula.id);
    }

    return formulas.length;
  }

  public static async castable(characterId: string, formulaIds: string[]) {
    if (!formulaIds.length) {
      return new Set<string>();
    }

    const formulas = await prisma.spellFormula.findMany({
      where: { id: { in: formulaIds }, status: RuneDesignStatus.APPROVED },
      select: { id: true, runeKey: true, minMastery: true },
    });

    const records = await prisma.characterRune.findMany({
      where: { characterId, runeKey: { in: formulas.map((formula) => formula.runeKey) } },
      select: { runeKey: true, mastery: true },
    });

    return new Set(
      formulas
        .filter((formula) => {
          const record = records.find((entry) => entry.runeKey === formula.runeKey);
          return record !== undefined && record.mastery >= formula.minMastery;
        })
        .map((formula) => formula.id),
    );
  }

  public static async get(id: string) {
    const formula = await prisma.spellFormula.findUnique({ where: { id }, include: FORMULA_INCLUDE });

    if (!formula) {
      throw new RuneError("Формула не найдена.");
    }

    return formula;
  }

  public static list(statuses: RuneDesignStatus[]) {
    return prisma.spellFormula.findMany({
      where: { status: { in: statuses } },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      take: 25,
      include: FORMULA_INCLUDE,
    });
  }

  public static count(status: RuneDesignStatus) {
    return prisma.spellFormula.count({ where: { status } });
  }

  public static byAuthorCharacter(characterId: string) {
    return prisma.spellFormula.findMany({
      where: { authorCharacterId: characterId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: FORMULA_INCLUDE,
    });
  }

  public static async propose(discordId: string, characterId: string, draft: FormulaDraft) {
    const character = await RuneService.getOwnedCharacter(discordId, characterId);

    if ((await RuneService.mastery(character.id, draft.runeKey)) === null) {
      throw new RuneError("Предложить формулу можно только с изученной руной.");
    }

    const formula = await this.store(draft, discordId, RuneDesignStatus.PENDING, character.id);

    await RuneAudit.write({
      action: RuneAuditAction.FORMULA_PROPOSED,
      actorId: discordId,
      characterId: character.id,
      runeKey: formula.runeKey,
      formulaId: formula.id,
    });

    return formula;
  }

  public static async create(actorId: string, draft: FormulaDraft) {
    const formula = await this.store(draft, actorId, RuneDesignStatus.PENDING, null);

    await RuneAudit.write({
      action: RuneAuditAction.FORMULA_CREATED,
      actorId,
      runeKey: formula.runeKey,
      formulaId: formula.id,
    });

    return formula;
  }

  public static async update(id: string, actorId: string, draft: Omit<FormulaDraft, "spellQuery" | "runeKey">) {
    const formula = await this.get(id);
    const data = await this.parseText(draft, formula.id);

    const updated = await prisma.spellFormula.update({ where: { id }, data, include: FORMULA_INCLUDE }).catch((error) => {
      throw this.uniqueError(error);
    });

    await RuneAudit.write({
      action: RuneAuditAction.FORMULA_UPDATED,
      actorId,
      runeKey: formula.runeKey,
      formulaId: formula.id,
    });

    await this.syncSpell(updated.id);

    return updated;
  }

  public static async approve(id: string, actorId: string, review: FormulaReview) {
    const formula = await this.get(id);
    const settings = await RuneRegistry.getSettings();

    const minMastery = this.number(review.minMastery, 0, RUNE_MAX_MASTERY, "Минимальное владение", 0);
    const baseRisk = this.number(review.baseRisk, 0, 100, "Базовый риск", settings.defaultBaseRisk);
    const complexity = this.number(review.complexity, 0, 100, "Сложность", 0);
    const failureOutcome = review.failureOutcome as RuneOutcome;

    if (!FORMULA_OUTCOMES.includes(failureOutcome)) {
      throw new RuneError("Выберите последствие неудачи.");
    }

    const updated = await prisma.spellFormula.update({
      where: { id: formula.id },
      data: {
        minMastery,
        baseRisk,
        complexity,
        failureOutcome,
        status: RuneDesignStatus.APPROVED,
        reviewerId: actorId,
        reviewReason: null,
        reviewedAt: new Date(),
      },
      include: FORMULA_INCLUDE,
    });

    await RuneAudit.write({
      action: RuneAuditAction.FORMULA_APPROVED,
      actorId,
      characterId: formula.authorCharacterId,
      runeKey: formula.runeKey,
      formulaId: formula.id,
    });

    await this.syncSpell(updated.id);

    return updated;
  }

  public static async reject(id: string, actorId: string, reasonInput: string) {
    const formula = await this.get(id);
    const reason = reasonInput.trim();

    if (reason.length < 3) {
      throw new RuneError("Укажите причину отказа.");
    }

    const updated = await prisma.spellFormula.update({
      where: { id: formula.id },
      data: { status: RuneDesignStatus.REJECTED, reviewerId: actorId, reviewReason: reason.slice(0, 500), reviewedAt: new Date() },
      include: FORMULA_INCLUDE,
    });

    await RuneAudit.write({
      action: RuneAuditAction.FORMULA_REJECTED,
      actorId,
      characterId: formula.authorCharacterId,
      runeKey: formula.runeKey,
      formulaId: formula.id,
      note: reason,
    });

    await this.syncSpell(updated.id);

    return updated;
  }

  public static async toggle(id: string, actorId: string) {
    const formula = await this.get(id);

    if (formula.status !== RuneDesignStatus.APPROVED && formula.status !== RuneDesignStatus.DISABLED) {
      throw new RuneError("Отключить или включить можно только утверждённую формулу.");
    }

    const status = formula.status === RuneDesignStatus.APPROVED ? RuneDesignStatus.DISABLED : RuneDesignStatus.APPROVED;

    const updated = await prisma.spellFormula.update({ where: { id }, data: { status }, include: FORMULA_INCLUDE });

    await RuneAudit.write({
      action: status === RuneDesignStatus.DISABLED ? RuneAuditAction.FORMULA_DISABLED : RuneAuditAction.FORMULA_APPROVED,
      actorId,
      runeKey: formula.runeKey,
      formulaId: formula.id,
    });

    await this.syncSpell(updated.id);

    return updated;
  }

  public static async available(characterId: string): Promise<AvailableFormula[]> {
    const [learned, settings] = await Promise.all([RuneService.learned(characterId), RuneRegistry.getSettings()]);

    if (!learned.length) {
      return [];
    }

    const formulas = await prisma.spellFormula.findMany({
      where: { status: RuneDesignStatus.APPROVED, runeKey: { in: learned.map((entry) => entry.rune.key) } },
      orderBy: { createdAt: "asc" },
      take: 25,
      include: FORMULA_INCLUDE,
    });

    return formulas.map((formula) => {
      const mastery = learned.find((entry) => entry.rune.key === formula.runeKey)!.mastery;

      return {
        formula,
        mastery,
        risk: RuneRules.risk({ baseRisk: formula.baseRisk, complexity: formula.complexity, mastery }, settings),
        allowed: mastery >= formula.minMastery,
      };
    });
  }

  private static async store(draft: FormulaDraft, authorId: string, status: RuneDesignStatus, characterId: string | null) {
    const spell = await this.findSpell(draft.spellQuery);
    const rune = await RuneRegistry.get(draft.runeKey);
    const data = await this.parseText(draft, null);
    const settings = await RuneRegistry.getSettings();

    return prisma.spellFormula
      .create({
        data: {
          ...data,
          spellId: spell.id,
          runeKey: rune.key,
          status,
          authorId,
          authorCharacterId: characterId,
          baseRisk: settings.defaultBaseRisk,
        },
        include: FORMULA_INCLUDE,
      })
      .catch((error) => {
        throw this.uniqueError(error);
      });
  }

  private static async parseText(draft: Omit<FormulaDraft, "spellQuery" | "runeKey">, formulaId: string | null) {
    const incantation = draft.incantation.trim().replace(/\s+/g, " ");
    const incantationKey = SpellMatcher.normalize(incantation);
    const effect = draft.effect.trim();

    if (incantationKey.length < 2 || incantation.length > 80) {
      throw new RuneError("Прононс должен быть от 2 до 80 символов.");
    }

    if (effect.length < 5) {
      throw new RuneError("Опишите эффект модифицированного заклинания.");
    }

    await SpellService.ensureCache();

    const clash = SpellCache.all().find((spell) =>
      spell.formulaId !== formulaId &&
      spell.incantations.some((other) => SpellMatcher.normalize(other) === incantationKey),
    );

    if (clash) {
      throw new RuneError(`Прононс «${incantation}» совпадает с формулой заклинания «${clash.name}».`);
    }

    const existing = await prisma.spellFormula.findUnique({ where: { incantationKey } });

    if (existing && existing.id !== formulaId) {
      throw new RuneError(`Прононс «${incantation}» уже занят другой формулой.`);
    }

    return {
      incantation,
      incantationKey,
      effect: effect.slice(0, 1000),
      mechanics: draft.mechanics?.trim().slice(0, 1000) || null,
      restrictions: draft.restrictions?.trim().slice(0, 1000) || null,
    };
  }

  private static number(input: string, min: number, max: number, label: string, fallback: number) {
    const text = input.trim();

    if (!text) {
      return fallback;
    }

    if (!/^\d+$/.test(text) || Number(text) < min || Number(text) > max) {
      throw new RuneError(`${label}: целое число от ${min} до ${max}.`);
    }

    return Number(text);
  }

  private static uniqueError(error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return new RuneError("Такой прононс уже занят другой формулой.");
    }

    return error;
  }
}
