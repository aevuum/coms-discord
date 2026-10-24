import { container } from "@sapphire/framework";

import {
  SpellDifficulty,
  type Spell,
} from "../../../database/generated/prisma/client.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import type { BaseInteraction } from "discord.js";
import { SpellCache } from "../cache/spellCache.js";
import { SPELL_SEED } from "../data/spellSeed.js";
import { Storage } from "../../../lib/storage.js";
import { GIF_CACHE_TTL_MS, GIFS_STORED_PER_SPELL, MAX_SPELL_COST } from "../lib/spellConfig.js";
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

  public static readonly MANAGE_KEY = "manage.spells";

  private static readonly MAX_INCANTATIONS = 10;

  private static readonly gifDownloads = new Map<string, Promise<string[]>>();

  public static async loadCache() {
    if (!(await SpellRepository.count())) {
      await SpellRepository.seed(SPELL_SEED);
    }

    SpellCache.set(await SpellRepository.getAll());

    return SpellCache.all().length;
  }

  public static async assertCanManage(interaction: BaseInteraction) {
    const subject = await PermissionService.resolveSubject(interaction);

    if (!(await PermissionService.canUse(subject, this.MANAGE_KEY))) {
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

    const spell = await SpellRepository.create(data).catch(async (error) => {
      await Storage.delete(data.imagePath);
      throw error;
    });

    SpellCache.update(spell);

    return spell;
  }

  public static async update(spellId: string, input: SpellInput) {
    const previous = this.assertEditable(await this.getSpell(spellId));

    const data = await this.parseInput(input, previous);

    const spell = await SpellRepository.update(spellId, data).catch(async (error) => {
      if (data.imagePath) {
        await Storage.delete(data.imagePath);
      }

      throw error;
    });

    SpellCache.update(spell);

    if (data.imagePath !== undefined && previous.imagePath) {
      await Storage.delete(previous.imagePath);
    }

    await Promise.all(previous.gifPaths.map((path) => Storage.delete(path)));

    return spell;
  }

  public static async setDescription(spellId: string, input: string) {
    this.assertEditable(await this.getSpell(spellId));

    const description = input.trim();

    if (description.length > 1000) {
      throw new SpellError("Описание должно быть не длиннее 1000 символов.");
    }

    const spell = await SpellRepository.setDescription(spellId, description || null);

    SpellCache.update(spell);

    return spell;
  }

  public static async delete(spellId: string) {
    const spell = this.assertEditable(await this.getSpell(spellId));

    await SpellRepository.delete(spell.id);

    SpellCache.remove(spell.id);

    await Promise.all([spell.imagePath, ...spell.gifPaths].map((path) => Storage.delete(path)));

    return spell;
  }

  private static assertEditable(spell: Spell) {
    if (spell.formulaId) {
      throw new SpellError("Это заклинание создано формулой рун. Меняйте его в /manage → Руны и артефакты → Формулы.");
    }

    return spell;
  }

  public static async getImage(spell: Spell) {
    const own = Storage.media(spell.imagePath, spell.imageUrl);

    if (own) {
      return own;
    }

    const paths = spell.gifPaths.length ? spell.gifPaths : await this.storeGifs(spell);

    return paths.length ? Storage.url(paths[Math.floor(Math.random() * paths.length)]) : null;
  }

  private static async storeGifs(spell: Spell) {
    if (!GifService.isEnabled()) {
      return [];
    }

    if (spell.gifFetchedAt && Date.now() - spell.gifFetchedAt.getTime() < GIF_CACHE_TTL_MS) {
      return [];
    }

    const pending = this.gifDownloads.get(spell.id);

    if (pending) {
      return pending;
    }

    const download = (async () => {
      const found = await GifService.search(this.gifQuery(spell));

      const paths = (
        await Promise.all(
          found
            .slice(0, GIFS_STORED_PER_SPELL)
            .map((url) => Storage.uploadFromUrl(url).catch(() => null)),
        )
      ).filter((path): path is string => path !== null);

      try {
        SpellCache.update(await SpellRepository.updateGifs(spell.id, paths));
      } catch (error) {
        container.logger.error(error);
        await Promise.all(paths.map((path) => Storage.delete(path)));

        return [];
      }

      return paths;
    })().finally(() => this.gifDownloads.delete(spell.id));

    this.gifDownloads.set(spell.id, download);

    return download;
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
    previous?: Spell,
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
          spell.id !== previous?.id &&
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

    const imagePath = await Storage.fromLink(
      input.imageUrl,
      previous?.imagePath ?? null,
      previous?.imageUrl ?? null,
    );

    return {
      name,
      incantations,
      difficulty,
      manaCost,
      ...(imagePath !== undefined ? { imagePath, imageUrl: null } : {}),
    };
  }
}
