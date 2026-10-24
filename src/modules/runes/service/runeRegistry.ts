import { container } from "@sapphire/framework";

import type { Rune, RuneFuthark, RuneSettings } from "../../../database/generated/prisma/client.js";

import prisma from "../../../database/prisma.js";
import { RUNE_SEED } from "../lib/runeCatalog.js";

export class RuneError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "RuneError";
  }
}

export class RuneRegistry {
  private static runes: Rune[] = [];

  private static settings: RuneSettings | null = null;

  public static async load() {
    const existing = new Set((await prisma.rune.findMany({ select: { key: true } })).map((rune) => rune.key));

    const missing = RUNE_SEED.map((seed, index) => ({ ...seed, sortOrder: index })).filter(
      (seed) => !existing.has(seed.key),
    );

    if (missing.length) {
      await prisma.rune.createMany({ data: missing, skipDuplicates: true });
      container.logger.info(`Seeded ${missing.length} runes`);
    }

    this.runes = await prisma.rune.findMany({ orderBy: [{ futhark: "asc" }, { sortOrder: "asc" }] });
    this.settings = await prisma.runeSettings.upsert({ where: { id: "global" }, create: {}, update: {} });

    return this.runes.length;
  }

  public static async ensure() {
    if (!this.runes.length || !this.settings) {
      await this.load();
    }
  }

  public static async all() {
    await this.ensure();

    return this.runes;
  }

  public static async of(futhark: RuneFuthark) {
    return (await this.all()).filter((rune) => rune.futhark === futhark);
  }

  public static async get(key: string) {
    const rune = (await this.all()).find((entry) => entry.key === key);

    if (!rune) {
      throw new RuneError("Руна не найдена.");
    }

    return rune;
  }

  public static async find(query: string) {
    const text = query.trim().toLocaleLowerCase("ru").replace(/ё/g, "е");

    if (!text) {
      return null;
    }

    return (
      (await this.all()).find(
        (rune) =>
          rune.key === text ||
          rune.name.toLocaleLowerCase("ru").replace(/ё/g, "е") === text ||
          rune.key.split("_")[1] === text,
      ) ?? null
    );
  }

  public static async getSettings() {
    await this.ensure();

    return this.settings!;
  }

  public static replace(rune: Rune) {
    this.runes = this.runes.map((entry) => (entry.key === rune.key ? rune : entry));
  }

  public static replaceSettings(settings: RuneSettings) {
    this.settings = settings;
  }
}
