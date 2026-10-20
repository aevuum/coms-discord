import prisma from "../../../database/prisma.js";

import { TupperCache } from "../cache/tupperCache.js";

const withCharacter = {
  character: {
    include: {
      user: true,
    },
  },
} as const;

export class TupperRepository {
  public static markUsed(characterId: string, channelId: string) {
    return prisma.characterTupper.updateMany({
      where: { characterId },
      data: { lastChannelId: channelId, lastUsedAt: new Date() },
    });
  }

  public static async create(
    characterId: string,
    name: string,
    prefix: string,
  ) {
    const tupper = await prisma.characterTupper.create({
      data: {
        characterId,
        name,
        prefix,
      },

      include: withCharacter,
    });

    TupperCache.insert(tupper);

    return tupper;
  }

  public static async findByCharacter(characterId: string) {
    return prisma.characterTupper.findUnique({
      where: {
        characterId,
      },
    });
  }

  public static async getByPrefix(prefix: string) {
    return prisma.characterTupper.findUnique({
      where: {
        prefix,
      },
    });
  }

  public static async updateName(characterId: string, name: string) {
    const updated = await prisma.characterTupper.update({
      where: {
        characterId,
      },

      data: {
        name,
      },

      include: withCharacter,
    });

    TupperCache.remove(updated.prefix);
    TupperCache.insert(updated);

    return updated;
  }

  public static async updatePrefix(characterId: string, prefix: string) {
    const current = await prisma.characterTupper.findUniqueOrThrow({
      where: {
        characterId,
      },
    });

    const updated = await prisma.characterTupper.update({
      where: {
        characterId,
      },

      data: {
        prefix,
      },

      include: withCharacter,
    });

    TupperCache.remove(current.prefix);
    TupperCache.insert(updated);

    return updated;
  }

  public static async loadCache() {
    const tuppers = await prisma.characterTupper.findMany({
      include: withCharacter,
    });

    TupperCache.clear();

    for (const tupper of tuppers) {
      TupperCache.insert(tupper);
    }

    return tuppers.length;
  }

  public static async delete(characterId: string) {
    const tupper = await prisma.characterTupper.findUnique({
      where: {
        characterId,
      },
    });

    if (!tupper) {
      return null;
    }

    TupperCache.remove(tupper.prefix);

    return prisma.characterTupper.delete({
      where: {
        characterId,
      },
    });
  }
}
