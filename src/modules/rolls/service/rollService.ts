import { randomInt } from "node:crypto";

import type { BaseInteraction, Client } from "discord.js";

import type { RollEntry } from "../../../database/generated/prisma/client.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { ROLL_KINDS } from "../lib/rollKinds.js";
import { ROLL_SEED } from "../lib/rollSeed.js";
import { RollRepository, type RollEntryData } from "../repositories/rollRepository.js";
import { RollError, RollKind, type RollEntryInput } from "../types/rolls.js";

export const CHANCE_SCALE = 10_000;

export class RollService {
  public static readonly MANAGE_KEY = "manage.rolls";

  public static readonly MAX_ENTRIES = 25;

  public static async assertCanManage(interaction: BaseInteraction) {
    const subject = await PermissionService.resolveSubject(interaction);

    if (!(await PermissionService.canUse(subject, this.MANAGE_KEY))) {
      throw new RollError("У вас нет доступа к настройке рас и трейтов.");
    }
  }

  public static async seed() {
    let created = 0;

    for (const kind of Object.values(RollKind)) {
      if (await RollRepository.count(kind)) {
        continue;
      }

      for (const entry of ROLL_SEED.filter((seed) => seed.kind === kind)) {
        await RollRepository.create(kind, {
          name: entry.name,
          description: entry.description,
          emoji: entry.emoji,
          imageUrl: entry.imageUrl,
          chance: entry.chance,
          isDefault: entry.isDefault ?? false,
        });

        created++;
      }
    }

    return created;
  }

  public static list(kind: RollKind) {
    return RollRepository.list(kind);
  }

  public static async get(id: string) {
    const entry = await RollRepository.get(id);

    if (!entry) {
      throw new RollError("Вариант не найден.");
    }

    return entry;
  }

  public static async roll(kind: RollKind) {
    const entries = await RollRepository.list(kind);

    const fallback = entries.find((entry) => entry.isDefault);

    if (!fallback) {
      throw new RollError(`${ROLL_KINDS[kind].plural} ещё не настроены.`);
    }

    const value = randomInt(0, CHANCE_SCALE);

    let cumulative = 0;

    for (const entry of entries) {
      if (entry.isDefault) {
        continue;
      }

      cumulative += entry.chance;

      if (value < cumulative) {
        return { entry, entries };
      }
    }

    return { entry: fallback, entries };
  }

  public static effectiveChance(entry: RollEntry, entries: RollEntry[]) {
    if (!entry.isDefault) {
      return entry.chance;
    }

    const taken = entries
      .filter((other) => !other.isDefault)
      .reduce((sum, other) => sum + other.chance, 0);

    return Math.max(CHANCE_SCALE - taken, 0);
  }

  public static stars(chance: number) {
    if (chance >= 1000) return 1;
    if (chance >= 400) return 2;
    if (chance >= 200) return 3;
    if (chance >= 100) return 4;
    return 5;
  }

  public static formatChance(chance: number) {
    const percent = chance / 100;

    return `${percent.toLocaleString("ru-RU", { maximumFractionDigits: 2 })}%`;
  }

  public static async create(client: Client, kind: RollKind, input: RollEntryInput) {
    const entries = await RollRepository.list(kind);

    if (entries.length >= this.MAX_ENTRIES) {
      throw new RollError(`Вариантов не может быть больше ${this.MAX_ENTRIES}.`);
    }

    const data = this.parse(client, input, false);

    this.assertTotal(entries, null, data.chance);

    return RollRepository.create(kind, data);
  }

  public static async update(client: Client, id: string, input: RollEntryInput) {
    const entry = await this.get(id);

    const data = this.parse(client, input, entry.isDefault);

    if (!entry.isDefault) {
      this.assertTotal(await RollRepository.list(entry.kind), entry.id, data.chance);
    }

    return RollRepository.update(entry.id, data);
  }

  public static async delete(id: string) {
    const entry = await this.get(id);

    if (entry.isDefault) {
      throw new RollError("Вариант по умолчанию нельзя удалить — его можно только изменить.");
    }

    await RollRepository.delete(entry.id);

    return entry;
  }

  private static assertTotal(entries: RollEntry[], exceptId: string | null, chance: number) {
    const others = entries
      .filter((entry) => !entry.isDefault && entry.id !== exceptId)
      .reduce((sum, entry) => sum + entry.chance, 0);

    if (others + chance > CHANCE_SCALE) {
      throw new RollError(
        `Сумма шансов всех вариантов не может превышать 100%. Сейчас свободно: ${this.formatChance(CHANCE_SCALE - others)}.`,
      );
    }
  }

  private static parse(client: Client, input: RollEntryInput, isDefault: boolean): RollEntryData {
    const name = input.name.trim().replace(/\s+/g, " ");

    if (name.length < 2 || name.length > 40) {
      throw new RollError("Название должно быть от 2 до 40 символов.");
    }

    const description = input.description.trim();

    if (description.length > 500) {
      throw new RollError("Описание должно быть не длиннее 500 символов.");
    }

    const imageUrl = input.imageUrl.trim();

    if (imageUrl && !/^https:\/\/\S+$/i.test(imageUrl)) {
      throw new RollError("Ссылка на картинку должна начинаться с https://.");
    }

    return {
      name,
      description: description || null,
      emoji: this.parseEmoji(client, input.emoji),
      imageUrl: imageUrl || null,
      chance: isDefault ? 0 : this.parseChance(input.chance ?? ""),
    };
  }

  private static parseChance(input: string) {
    const text = input.trim().replace("%", "").replace(",", ".");

    if (!/^\d+(\.\d{1,2})?$/.test(text)) {
      throw new RollError("Шанс укажите в процентах, например 0.5 или 2.");
    }

    const chance = Math.round(Number(text) * 100);

    if (chance < 1 || chance > CHANCE_SCALE) {
      throw new RollError("Шанс должен быть от 0.01% до 100%.");
    }

    return chance;
  }

  private static parseEmoji(client: Client, input: string) {
    const text = input.trim();

    if (!text) {
      return null;
    }

    const custom = text.match(/^<a?:\w{2,32}:(\d{17,20})>$/);

    if (custom) {
      if (!client.emojis.cache.has(custom[1])) {
        throw new RollError("Бот не может использовать этот эмодзи. Выберите эмодзи с сервера или обычный.");
      }

      return text;
    }

    if (
      /^(\p{Extended_Pictographic}|\p{Regional_Indicator}|‍|️|⃣|[#*0-9]|\p{Emoji_Modifier})+$/u.test(text) &&
      [...text].length <= 8
    ) {
      return text;
    }

    throw new RollError("Эмодзи должен быть одним обычным эмодзи или эмодзи с сервера.");
  }
}
