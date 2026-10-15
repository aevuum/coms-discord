import { container } from "@sapphire/framework";

import {
  SpellDifficulty,
  type Spell,
} from "../../../database/generated/prisma/client.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import type { AccessSubject } from "../../permissions/types/permissions.js";
import { SpellCache } from "../cache/spellCache.js";
import { SPELL_SEED } from "../data/spellSeed.js";
import { GIF_CACHE_TTL_MS, MAX_SPELL_COST } from "../lib/spellConfig.js";
import { SpellMatcher } from "../lib/spellMatcher.js";
import {
  SpellRepository,
  type SpellData,
} from "../repositories/spellRepository.js";
import {
  SpellError,
  type SpellInput,
  type SpellPage,
} from "../types/spells.js";
import { GifService } from "./gifService.js";

export class SpellService {
  public static readonly PAGE_SIZE = 10;

  public static readonly MANAGE_COMMAND = "spells";

  private static readonly MAX_INCANTATIONS = 10;

  public static async loadCache() {
    if (!(await SpellRepository.count())) {
      await SpellRepository.seed(SPELL_SEED);
    }

    SpellCache.set(await SpellRepository.getAll());

    return SpellCache.all().length;
  }

  public static async assertCanManage(subject: AccessSubject) {
    if (!(await PermissionService.canUse(subject, this.MANAGE_COMMAND))) {
      throw new SpellError("У вас нет доступа к управлению заклинаниями.");
    }
  }

  public static async ensureCache() {
    if (!SpellCache.isLoaded()) {
      await this.loadCache();
    }
  }

  public static async match(text: string) {
    await this.ensureCache();

    return SpellCache.match(text);
  }

  public static async getPage(page: number): Promise<SpellPage> {
    await this.ensureCache();

    const spells = [...SpellCache.all()].sort((left, right) =>
      left.name.localeCompare(right.name, "ru"),
    );

    const totalPages = Math.max(1, Math.ceil(spells.length / this.PAGE_SIZE));

    const safePage = Number.isInteger(page)
      ? Math.min(Math.max(page, 0), totalPages - 1)
      : 0;

    return {
      spells: spells.slice(
        safePage * this.PAGE_SIZE,
        (safePage + 1) * this.PAGE_SIZE,
      ),
      page: safePage,
      totalPages,
      total: spells.length,
    };
  }

  public static async getSpell(spellId: string) {
    await this.ensureCache();

    const spell = SpellCache.all().find((item) => item.id === spellId);

    if (!spell) {
      throw new SpellError("Заклинание не найдено.");
    }

    return spell;
  }

  public static async create(input: SpellInput) {
    const data = await this.parseInput(input);

    const spell = await SpellRepository.create(data);

    SpellCache.update(spell);

    return spell;
  }

  public static async update(spellId: string, input: SpellInput) {
    await this.getSpell(spellId);

    const data = await this.parseInput(input, spellId);

    const spell = await SpellRepository.update(spellId, data);

    SpellCache.update(spell);

    return spell;
  }

  public static async delete(spellId: string) {
    const spell = await this.getSpell(spellId);

    await SpellRepository.delete(spell.id);

    SpellCache.remove(spell.id);

    return spell;
  }

  public static async getImage(spell: Spell) {
    if (spell.imageUrl) {
      return spell.imageUrl;
    }

    if (!GifService.isEnabled()) {
      return null;
    }

    let gifUrls = spell.gifUrls;

    const expired =
      !spell.gifFetchedAt ||
      Date.now() - spell.gifFetchedAt.getTime() > GIF_CACHE_TTL_MS;

    if (!gifUrls.length || expired) {
      const found = await GifService.search(this.gifQuery(spell));

      if (found.length) {
        try {
          SpellCache.update(await SpellRepository.updateGifs(spell.id, found));
        } catch (error) {
          container.logger.error(error);
        }

        gifUrls = found;
      }
    }

    return gifUrls.length
      ? gifUrls[Math.floor(Math.random() * gifUrls.length)]
      : null;
  }

  private static gifQuery(spell: Spell) {
    if (spell.gifQuery) {
      return spell.gifQuery;
    }

    const latin = spell.incantations.find((incantation) =>
      /^[a-z\s']+$/i.test(incantation),
    );

    return latin ?? spell.incantations[0] ?? spell.name;
  }

  private static async parseInput(
    input: SpellInput,
    spellId?: string,
  ): Promise<SpellData> {
    await this.ensureCache();

    const name = input.name.trim();

    if (name.length < 2 || name.length > 80) {
      throw new SpellError("Название должно быть от 2 до 80 символов.");
    }

    const incantations = [
      ...new Set(
        input.incantations
          .split(/[,\n;]/)
          .map((incantation) => incantation.trim().replace(/\s+/g, " "))
          .filter(Boolean),
      ),
    ];

    if (!incantations.length) {
      throw new SpellError("Укажите хотя бы одну формулу заклинания.");
    }

    if (incantations.length > this.MAX_INCANTATIONS) {
      throw new SpellError(
        `Можно указать не больше ${this.MAX_INCANTATIONS} формул.`,
      );
    }

    for (const incantation of incantations) {
      const normalized = SpellMatcher.normalize(incantation);

      if (normalized.length < 2 || incantation.length > 60) {
        throw new SpellError(
          `Формула «${incantation}» должна быть от 2 до 60 символов.`,
        );
      }

      const conflict = SpellCache.all().find(
        (spell) =>
          spell.id !== spellId &&
          spell.incantations.some(
            (other) => SpellMatcher.normalize(other) === normalized,
          ),
      );

      if (conflict) {
        throw new SpellError(
          `Формула «${incantation}» уже используется в заклинании «${conflict.name}».`,
        );
      }
    }

    const difficulty = input.difficulty as SpellDifficulty;

    if (!Object.values(SpellDifficulty).includes(difficulty)) {
      throw new SpellError("Выберите сложность заклинания.");
    }

    const costText = input.manaCost.trim();

    let manaCost: number | null = null;

    if (costText.length) {
      if (!/^\d+$/.test(costText) || Number(costText) > MAX_SPELL_COST) {
        throw new SpellError(
          `Стоимость маны должна быть целым числом от 0 до ${MAX_SPELL_COST}.`,
        );
      }

      manaCost = Number(costText);
    }

    const imageText = input.imageUrl.trim();

    let imageUrl: string | null = null;

    if (imageText.length) {
      let parsed: URL;

      try {
        parsed = new URL(imageText);
      } catch {
        throw new SpellError("Ссылка на картинку некорректна.");
      }

      if (parsed.protocol !== "https:" || imageText.length > 500) {
        throw new SpellError(
          "Ссылка на картинку должна начинаться с https:// и быть не длиннее 500 символов.",
        );
      }

      imageUrl = imageText;
    }

    return {
      name,
      incantations,
      difficulty,
      manaCost,
      imageUrl,
    };
  }
}
