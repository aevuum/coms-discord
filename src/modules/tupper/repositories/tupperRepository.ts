import prisma from "../../../database/prisma.js";

import { TupperCache } from "../cache/tupperCache.js";

export class TupperRepository {
  public static async create(
    characterId: string,
    name: string,
    prefix: string,
  ) {
    const created = await prisma.characterTupper.create({
      data: {
        characterId,
        name,
        prefix,
      },
    });

    const tupper = await prisma.characterTupper.findUniqueOrThrow({
      where: {
        id: created.id,
      },

      include: {
        character: {
          include: {
            user: true,
          },
        },
      },
    });

    TupperCache.insert(tupper);

    return tupper;
  }

  public static async getByCharacterId(characterId: string) {
    return prisma.characterTupper.findUnique({
      where: {
        characterId,
      },

      include: {
        character: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  public static async getById(id: string) {
    return prisma.characterTupper.findUnique({
      where: {
        id,
      },

      include: {
        character: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  public static async getByPrefix(prefix: string) {
    return prisma.characterTupper.findUnique({
      where: {
        prefix,
      },

      include: {
        character: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  public static async updateName(characterId: string, name: string) {
    const updated = await prisma.characterTupper.upsert({
      where: {
        characterId,
      },

      update: {
        name,
      },

      create: {
        characterId,
        name,
        prefix: "default",
      },

      include: {
        character: {
          include: {
            user: true,
          },
        },
      },
    });

    TupperCache.remove(updated.prefix);
    TupperCache.insert(updated);

    return updated;
  }

  public static async updatePrefix(characterId: string, prefix: string) {
    const current = await prisma.characterTupper.findUnique({
      where: {
        characterId,
      },
    });

    if (current) {
      TupperCache.remove(current.prefix);
    }

    const updated = await prisma.characterTupper.upsert({
      where: {
        characterId,
      },

      update: {
        prefix,
      },

      create: {
        characterId,
        prefix,
        name: "Без имени",
      },

      include: {
        character: {
          include: {
            user: true,
          },
        },
      },
    });

    TupperCache.insert(updated);

    return updated;
  }

  public static async loadCache() {
    TupperCache.clear();

    const tuppers = await prisma.characterTupper.findMany({
      include: {
        character: {
          include: {
            user: true,
          },
        },
      },
    });

    for (const tupper of tuppers) {
      TupperCache.insert(tupper);
    }
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
