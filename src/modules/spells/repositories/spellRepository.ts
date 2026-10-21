import prisma from "../../../database/prisma.js";

import type { SpellDifficulty } from "../../../database/generated/prisma/client.js";

import type { SpellSeed } from "../types/spells.js";

export type SpellData = {
  name: string;
  incantations: string[];
  difficulty: SpellDifficulty;
  manaCost: number | null;
  imagePath?: string | null;
  imageUrl?: null;
};

export class SpellRepository {
  public static async count() {
    return prisma.spell.count();
  }

  public static async getAll() {
    return prisma.spell.findMany({
      orderBy: {
        name: "asc",
      },
    });
  }

  public static async getById(id: string) {
    return prisma.spell.findUnique({
      where: {
        id,
      },
    });
  }

  public static async seed(spells: SpellSeed[]) {
    return prisma.spell.createMany({
      data: spells.map((spell) => ({
        name: spell.name,
        incantations: spell.incantations,
        difficulty: spell.difficulty,
        description: spell.description,
        gifQuery: spell.gifQuery,
      })),
    });
  }

  public static async create(data: SpellData) {
    return prisma.spell.create({
      data: {
        ...data,
        isCustom: true,
      },
    });
  }

  public static async update(id: string, data: SpellData) {
    return prisma.spell.update({
      where: {
        id,
      },

      data: {
        ...data,
        gifUrls: [],
        gifPaths: [],
        gifFetchedAt: null,
      },
    });
  }

  public static async updateGifs(id: string, gifPaths: string[]) {
    return prisma.spell.update({
      where: {
        id,
      },

      data: {
        gifUrls: [],
        gifPaths,
        gifFetchedAt: new Date(),
      },
    });
  }

  public static async delete(id: string) {
    return prisma.spell.delete({
      where: {
        id,
      },
    });
  }
}
