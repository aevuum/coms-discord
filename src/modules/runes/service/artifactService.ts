import {
  ArtifactStatus,
  Prisma,
  RuneAuditAction,
  RuneDesignStatus,
  RuneOperationKind,
  RuneOperationStatus,
  RuneOutcome,
} from "../../../database/generated/prisma/client.js";

import prisma from "../../../database/prisma.js";
import { RUNE_MAX_MASTERY } from "../lib/runeCatalog.js";
import {
  ARTIFACT_FAILURE_OUTCOMES,
  ARTIFACT_OVERLOAD_OUTCOMES,
  RuneRules,
} from "../lib/runeRules.js";
import { RuneAudit } from "./runeAudit.js";
import { RuneOperations } from "./runeOperations.js";
import { RuneError, RuneRegistry } from "./runeRegistry.js";
import { RuneService } from "./runeService.js";

type Db = Prisma.TransactionClient | typeof prisma;

const RECIPE_INCLUDE = {
  blank: true,
  runes: { include: { rune: true } },
  materials: { include: { material: true } },
} satisfies Prisma.ArtifactRecipeInclude;

export type RecipeWithRelations = Prisma.ArtifactRecipeGetPayload<{ include: typeof RECIPE_INCLUDE }>;

export type MaterialInput = { name: string; description: string; capacityBonus: string };

export type BlankInput = {
  name: string;
  kind: string;
  description: string;
  baseCapacity: string;
  qualityPercent: string;
};

export type RecipeInput = {
  name: string;
  effect: string;
  blank: string;
  runes: string;
  materials: string;
};

export type RecipeReview = {
  minMastery: string;
  baseRisk: string;
  complexity: string;
  overloadOutcome: string;
  failureOutcome: string;
};

export type MaterialNeed = {
  name: string;
  nameKey: string;
  need: number;
  have: number;
};

export type CraftPreview = {
  recipe: RecipeWithRelations;
  capacity: number;
  load: number;
  overloaded: boolean;
  risk: number;
  mastery: number;
  needs: MaterialNeed[];
  missingRunes: string[];
  weakRunes: string[];
  extraMaterialIds: string[];
  runeLoads: { runeKey: string; load: number; critical: boolean }[];
  blockers: string[];
};

const itemKey = (name: string) => name.trim().toLocaleLowerCase("ru");

export class ArtifactService {
  public static listMaterials() {
    return prisma.artifactMaterial.findMany({ orderBy: { name: "asc" }, take: 25 });
  }

  public static listBlanks() {
    return prisma.artifactBlank.findMany({ orderBy: { name: "asc" }, take: 25 });
  }

  public static async getMaterial(id: string) {
    const material = await prisma.artifactMaterial.findUnique({ where: { id } });

    if (!material) {
      throw new RuneError("Материал не найден.");
    }

    return material;
  }

  public static async getBlank(id: string) {
    const blank = await prisma.artifactBlank.findUnique({ where: { id } });

    if (!blank) {
      throw new RuneError("Заготовка не найдена.");
    }

    return blank;
  }

  public static async saveMaterial(id: string | null, input: MaterialInput, actorId: string) {
    const name = this.name(input.name, "Название материала");
    const capacityBonus = this.integer(input.capacityBonus, -100, 100, "Бонус вместимости", 0);
    const data = { name, description: input.description.trim().slice(0, 500) || null, capacityBonus };

    const material = await (id
      ? prisma.artifactMaterial.update({ where: { id }, data })
      : prisma.artifactMaterial.create({ data })
    ).catch((error) => {
      throw this.uniqueError(error, "Материал с таким названием уже есть.");
    });

    await RuneAudit.write({ action: RuneAuditAction.MATERIAL_CHANGED, actorId, note: `${name}: ${capacityBonus >= 0 ? "+" : ""}${capacityBonus}` });

    return material;
  }

  public static async saveBlank(id: string | null, input: BlankInput, actorId: string) {
    const name = this.name(input.name, "Название заготовки");
    const baseCapacity = this.integer(input.baseCapacity, 0, 1000, "Базовая вместимость", null);
    const qualityPercent = this.integer(input.qualityPercent, 10, 300, "Качество, %", 100);
    const data = {
      name,
      kind: input.kind.trim().slice(0, 60) || null,
      description: input.description.trim().slice(0, 500) || null,
      baseCapacity,
      qualityPercent,
    };

    const blank = await (id
      ? prisma.artifactBlank.update({ where: { id }, data })
      : prisma.artifactBlank.create({ data })
    ).catch((error) => {
      throw this.uniqueError(error, "Заготовка с таким названием уже есть.");
    });

    await RuneAudit.write({ action: RuneAuditAction.BLANK_CHANGED, actorId, note: `${name}: ${baseCapacity} × ${qualityPercent}%` });

    return blank;
  }

  public static async deleteMaterial(id: string, actorId: string) {
    const material = await this.getMaterial(id);

    await prisma.artifactMaterial.delete({ where: { id } }).catch(() => {
      throw new RuneError("Материал используется в рецептах. Сначала уберите его из рецептов.");
    });

    await RuneAudit.write({ action: RuneAuditAction.MATERIAL_CHANGED, actorId, note: `удалён: ${material.name}` });

    return material;
  }

  public static async deleteBlank(id: string, actorId: string) {
    const blank = await this.getBlank(id);

    await prisma.artifactBlank.delete({ where: { id } }).catch(() => {
      throw new RuneError("Заготовка используется в рецептах. Сначала измените эти рецепты.");
    });

    await RuneAudit.write({ action: RuneAuditAction.BLANK_CHANGED, actorId, note: `удалена: ${blank.name}` });

    return blank;
  }

  public static listRecipes(statuses: RuneDesignStatus[]) {
    return prisma.artifactRecipe.findMany({
      where: { status: { in: statuses } },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      take: 25,
      include: RECIPE_INCLUDE,
    });
  }

  public static countRecipes(status: RuneDesignStatus) {
    return prisma.artifactRecipe.count({ where: { status } });
  }

  public static async getRecipe(id: string, db: Db = prisma) {
    const recipe = await db.artifactRecipe.findUnique({ where: { id }, include: RECIPE_INCLUDE });

    if (!recipe) {
      throw new RuneError("Рецепт не найден.");
    }

    return recipe;
  }

  public static async saveRecipe(id: string | null, input: RecipeInput, actorId: string) {
    const name = this.name(input.name, "Название артефакта");
    const effect = input.effect.trim();

    if (effect.length < 5) {
      throw new RuneError("Опишите эффект артефакта.");
    }

    const blank = await prisma.artifactBlank.findFirst({
      where: { name: { equals: input.blank.trim(), mode: "insensitive" } },
    });

    if (!blank) {
      throw new RuneError(`Заготовка «${input.blank.trim()}» не найдена. Добавьте её в разделе «Заготовки».`);
    }

    const runes = await this.parseRunes(input.runes);
    const materials = await this.parseMaterials(input.materials);

    const recipe = await prisma.$transaction(async (tx) => {
      const data = { name, effect: effect.slice(0, 1000), blankId: blank.id };

      const saved = id
        ? await tx.artifactRecipe.update({
            where: { id },
            data: { ...data, status: RuneDesignStatus.PENDING, reviewerId: null, reviewedAt: null },
          })
        : await tx.artifactRecipe.create({ data: { ...data, authorId: actorId } });

      await tx.artifactRecipeRune.deleteMany({ where: { recipeId: saved.id } });
      await tx.artifactRecipeMaterial.deleteMany({ where: { recipeId: saved.id } });

      await tx.artifactRecipeRune.createMany({
        data: runes.map((rune) => ({ recipeId: saved.id, runeKey: rune.key, critical: rune.critical })),
      });

      if (materials.length) {
        await tx.artifactRecipeMaterial.createMany({
          data: materials.map((material) => ({ recipeId: saved.id, materialId: material.id, quantity: material.quantity })),
        });
      }

      await RuneAudit.write(
        { action: id ? RuneAuditAction.RECIPE_UPDATED : RuneAuditAction.RECIPE_CREATED, actorId, recipeId: saved.id, note: name },
        tx,
      );

      return saved;
    });

    return this.getRecipe(recipe.id);
  }

  public static async approveRecipe(id: string, actorId: string, review: RecipeReview) {
    const recipe = await this.getRecipe(id);
    const settings = await RuneRegistry.getSettings();

    const overloadOutcome = review.overloadOutcome as RuneOutcome;
    const failureOutcome = review.failureOutcome as RuneOutcome;

    if (!ARTIFACT_OVERLOAD_OUTCOMES.includes(overloadOutcome) || !ARTIFACT_FAILURE_OUTCOMES.includes(failureOutcome)) {
      throw new RuneError("Выберите последствия перегрузки и неудачи.");
    }

    await prisma.artifactRecipe.update({
      where: { id },
      data: {
        minMastery: this.integer(review.minMastery, 0, RUNE_MAX_MASTERY, "Минимальное владение", 0),
        baseRisk: this.integer(review.baseRisk, 0, 100, "Базовый риск", settings.defaultBaseRisk),
        complexity: this.integer(review.complexity, 0, 100, "Сложность", 0),
        overloadOutcome,
        failureOutcome,
        status: RuneDesignStatus.APPROVED,
        reviewerId: actorId,
        reviewReason: null,
        reviewedAt: new Date(),
      },
    });

    await RuneAudit.write({ action: RuneAuditAction.RECIPE_APPROVED, actorId, recipeId: recipe.id, note: recipe.name });

    return this.getRecipe(id);
  }

  public static async rejectRecipe(id: string, actorId: string, reasonInput: string) {
    const recipe = await this.getRecipe(id);
    const reason = reasonInput.trim();

    if (reason.length < 3) {
      throw new RuneError("Укажите причину отказа.");
    }

    await prisma.artifactRecipe.update({
      where: { id },
      data: { status: RuneDesignStatus.REJECTED, reviewerId: actorId, reviewReason: reason.slice(0, 500), reviewedAt: new Date() },
    });

    await RuneAudit.write({ action: RuneAuditAction.RECIPE_REJECTED, actorId, recipeId: recipe.id, note: reason });

    return this.getRecipe(id);
  }

  public static async toggleRecipe(id: string, actorId: string) {
    const recipe = await this.getRecipe(id);

    if (recipe.status !== RuneDesignStatus.APPROVED && recipe.status !== RuneDesignStatus.DISABLED) {
      throw new RuneError("Отключить или включить можно только утверждённый рецепт.");
    }

    const status = recipe.status === RuneDesignStatus.APPROVED ? RuneDesignStatus.DISABLED : RuneDesignStatus.APPROVED;

    await prisma.artifactRecipe.update({ where: { id }, data: { status } });

    await RuneAudit.write({
      action: status === RuneDesignStatus.DISABLED ? RuneAuditAction.RECIPE_DISABLED : RuneAuditAction.RECIPE_APPROVED,
      actorId,
      recipeId: recipe.id,
      note: recipe.name,
    });

    return this.getRecipe(id);
  }

  public static async recipeLoad(recipe: RecipeWithRelations) {
    const settings = await RuneRegistry.getSettings();

    const capacity = RuneRules.capacity({
      baseCapacity: recipe.blank.baseCapacity,
      qualityPercent: recipe.blank.qualityPercent,
      bonuses: recipe.materials.map((entry) => ({ capacityBonus: entry.material.capacityBonus, quantity: entry.quantity })),
    });

    return { capacity, load: RuneRules.totalLoad(recipe.runes.map((entry) => entry.rune), settings) };
  }

  public static characterArtifacts(characterId: string) {
    return prisma.artifact.findMany({
      where: { characterId },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { runes: { include: { rune: true } } },
    });
  }

  public static async getArtifact(characterId: string, artifactId: string) {
    const artifact = await prisma.artifact.findFirst({
      where: { id: artifactId, characterId },
      include: { runes: { include: { rune: true } }, recipe: { select: { name: true } } },
    });

    if (!artifact) {
      throw new RuneError("Артефакт не найден.");
    }

    return artifact;
  }

  public static async craftable(characterId: string) {
    const [recipes, learned] = await Promise.all([
      this.listRecipes([RuneDesignStatus.APPROVED]),
      RuneService.learned(characterId),
    ]);

    const known = new Set(learned.map((entry) => entry.rune.key));

    return recipes.map((recipe) => ({
      recipe,
      learnedAll: recipe.runes.every((entry) => known.has(entry.runeKey)),
    }));
  }

  public static async preview(
    characterId: string,
    recipeId: string,
    extraMaterialIds: string[],
    db: Db = prisma,
  ): Promise<CraftPreview> {
    const recipe = await this.getRecipe(recipeId, db);
    const settings = await RuneRegistry.getSettings();

    const records = await db.characterRune.findMany({
      where: { characterId, runeKey: { in: recipe.runes.map((entry) => entry.runeKey) } },
    });

    const extras = extraMaterialIds.length
      ? await db.artifactMaterial.findMany({ where: { id: { in: [...new Set(extraMaterialIds)] } } })
      : [];

    const missingRunes: string[] = [];
    const weakRunes: string[] = [];
    const masteryEntries = recipe.runes.flatMap((entry) => {
      const record = records.find((item) => item.runeKey === entry.runeKey);

      if (!record) {
        missingRunes.push(entry.rune.name);
        return [];
      }

      if (record.mastery < recipe.minMastery) {
        weakRunes.push(`${entry.rune.name} (${record.mastery}/${recipe.minMastery})`);
      }

      return [{ mastery: record.mastery, critical: entry.critical }];
    });

    const mastery = RuneRules.decisiveMastery(masteryEntries);

    const capacity = RuneRules.capacity({
      baseCapacity: recipe.blank.baseCapacity,
      qualityPercent: recipe.blank.qualityPercent,
      bonuses: [
        ...recipe.materials.map((entry) => ({ capacityBonus: entry.material.capacityBonus, quantity: entry.quantity })),
        ...extras.map((material) => ({ capacityBonus: material.capacityBonus, quantity: 1 })),
      ],
    });

    const runeLoads = recipe.runes.map((entry) => ({
      runeKey: entry.runeKey,
      load: RuneRules.runeLoad(entry.rune, settings),
      critical: entry.critical,
    }));
    const load = runeLoads.reduce((sum, entry) => sum + entry.load, 0);

    const required = new Map<string, MaterialNeed>();
    const add = (name: string, quantity: number) => {
      const key = itemKey(name);
      const current = required.get(key);

      required.set(key, { name, nameKey: key, need: (current?.need ?? 0) + quantity, have: 0 });
    };

    add(recipe.blank.name, 1);
    recipe.materials.forEach((entry) => add(entry.material.name, entry.quantity));
    extras.forEach((material) => add(material.name, 1));

    const items = await db.characterInventoryItem.findMany({
      where: { characterId, nameKey: { in: [...required.keys()] } },
      select: { nameKey: true, quantity: true },
    });

    const needs = [...required.values()].map((entry) => ({
      ...entry,
      have: items.find((item) => item.nameKey === entry.nameKey)?.quantity ?? 0,
    }));

    const overloaded = load > capacity;
    const risk = RuneRules.risk({ baseRisk: recipe.baseRisk, complexity: recipe.complexity, mastery }, settings);

    const blockers = [
      recipe.status !== RuneDesignStatus.APPROVED ? "Рецепт не утверждён или отключён." : null,
      missingRunes.length ? `Не изучены руны: ${missingRunes.join(", ")}.` : null,
      weakRunes.length ? `Недостаточное владение: ${weakRunes.join(", ")}.` : null,
      ...needs.filter((entry) => entry.have < entry.need).map((entry) => `Не хватает «${entry.name}»: ${entry.have}/${entry.need}.`),
      overloaded && recipe.overloadOutcome === RuneOutcome.REFUSE
        ? `Нагрузка ${load} превышает вместимость ${capacity}: добавьте материалы, повышающие вместимость.`
        : null,
    ].filter((entry): entry is string => entry !== null);

    return {
      recipe,
      capacity,
      load,
      overloaded,
      risk,
      mastery,
      needs,
      missingRunes,
      weakRunes,
      extraMaterialIds: extras.map((material) => material.id),
      runeLoads,
      blockers,
    };
  }

  public static async prepareCraft(discordId: string, characterId: string, recipeId: string, extraMaterialIds: string[]) {
    const character = await RuneService.getOwnedCharacter(discordId, characterId);
    const preview = await this.preview(character.id, recipeId, extraMaterialIds);

    if (preview.blockers.length) {
      throw new RuneError(preview.blockers.join("\n"));
    }

    const operation = await RuneOperations.open({
      kind: RuneOperationKind.ARTIFACT_CRAFT,
      characterId: character.id,
      actorId: discordId,
      recipeId,
      risk: preview.risk,
      extraMaterialIds: preview.extraMaterialIds,
    });

    return { operation, preview };
  }

  public static confirmCraft(discordId: string, operationId: string) {
    return RuneOperations.resolve(operationId, discordId, RuneOperationKind.ARTIFACT_CRAFT, async (tx, operation) => {
      const preview = await this.preview(operation.characterId, operation.recipeId!, operation.extraMaterialIds, tx);

      if (preview.blockers.length) {
        throw new RuneError(preview.blockers.join("\n"));
      }

      for (const need of preview.needs) {
        const spent = await tx.characterInventoryItem.updateMany({
          where: { characterId: operation.characterId, nameKey: need.nameKey, quantity: { gte: need.need } },
          data: { quantity: { decrement: need.need } },
        });

        if (!spent.count) {
          throw new RuneError(`Не хватает «${need.name}». Попытка отменена, ничего не потрачено.`);
        }
      }

      await tx.characterInventoryItem.deleteMany({
        where: { characterId: operation.characterId, quantity: { lte: 0 } },
      });

      const roll = RuneRules.roll();
      const success = !preview.overloaded && RuneRules.succeeded(roll, preview.risk);
      const outcome = preview.overloaded
        ? preview.recipe.overloadOutcome
        : success
          ? null
          : preview.recipe.failureOutcome;
      const quality = success ? RuneRules.quality(roll, preview.risk, preview.mastery) : null;

      const status =
        outcome === null
          ? ArtifactStatus.ACTIVE
          : outcome === RuneOutcome.DAMAGED
            ? ArtifactStatus.DAMAGED
            : outcome === RuneOutcome.UNSTABLE
              ? ArtifactStatus.UNSTABLE
              : null;

      const artifact = status
        ? await tx.artifact.create({
            data: {
              characterId: operation.characterId,
              recipeId: preview.recipe.id,
              operationId: operation.id,
              name: preview.recipe.name,
              effect: preview.recipe.effect,
              status,
              capacity: preview.capacity,
              load: preview.load,
              quality: quality ?? RuneRules.clamp(Math.round(preview.mastery / 4), 1, 100),
              runes: { create: preview.runeLoads },
            },
          })
        : null;

      await RuneAudit.write(
        {
          action: RuneAuditAction.ARTIFACT_CRAFTED,
          actorId: discordId,
          characterId: operation.characterId,
          recipeId: preview.recipe.id,
          fromValue: preview.risk,
          toValue: roll,
          note: success ? "успех" : outcome,
        },
        tx,
      );

      return {
        status: RuneOperationStatus.DONE,
        data: {
          roll,
          success,
          outcome,
          quality,
          details: { capacity: preview.capacity, load: preview.load, overloaded: preview.overloaded, artifactId: artifact?.id ?? null },
        },
        result: { preview, roll, success, outcome, quality, artifact },
      };
    });
  }

  private static async parseRunes(input: string) {
    const parts = input.split(/[,\n;]/).map((part) => part.trim()).filter(Boolean);

    if (!parts.length) {
      throw new RuneError("Укажите хотя бы одну руну рецепта.");
    }

    const runes: { key: string; critical: boolean }[] = [];

    for (const part of parts) {
      const critical = part.endsWith("*");
      const rune = await RuneRegistry.find(part.replace(/\*$/, ""));

      if (!rune) {
        throw new RuneError(`Руна «${part}» не найдена.`);
      }

      if (runes.some((entry) => entry.key === rune.key)) {
        throw new RuneError(`Руна ${rune.name} указана дважды.`);
      }

      runes.push({ key: rune.key, critical });
    }

    return runes;
  }

  private static async parseMaterials(input: string) {
    const parts = input.split(/[,\n;]/).map((part) => part.trim()).filter(Boolean);
    const result: { id: string; quantity: number }[] = [];

    for (const part of parts) {
      const match = part.match(/^(.+?)(?:\s*[x×*]\s*(\d+))?$/i);
      const name = match?.[1]?.trim() ?? part;
      const quantity = Number(match?.[2] ?? 1);

      const material = await prisma.artifactMaterial.findFirst({
        where: { name: { equals: name, mode: "insensitive" } },
      });

      if (!material) {
        throw new RuneError(`Материал «${name}» не найден. Добавьте его в разделе «Материалы».`);
      }

      if (quantity < 1 || quantity > 50) {
        throw new RuneError(`Количество материала «${name}» должно быть от 1 до 50.`);
      }

      if (result.some((entry) => entry.id === material.id)) {
        throw new RuneError(`Материал «${material.name}» указан дважды.`);
      }

      result.push({ id: material.id, quantity });
    }

    return result;
  }

  private static name(input: string, label: string) {
    const name = input.trim().replace(/\s+/g, " ");

    if (name.length < 2 || name.length > 80) {
      throw new RuneError(`${label}: от 2 до 80 символов.`);
    }

    return name;
  }

  private static integer(input: string, min: number, max: number, label: string, fallback: number | null) {
    const text = input.trim().replace("−", "-");

    if (!text && fallback !== null) {
      return fallback;
    }

    if (!/^-?\d+$/.test(text) || Number(text) < min || Number(text) > max) {
      throw new RuneError(`${label}: целое число от ${min} до ${max}.`);
    }

    return Number(text);
  }

  private static uniqueError(error: unknown, message: string) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return new RuneError(message);
    }

    return error;
  }
}
