import prisma from "../../../database/prisma.js";

import { CharacterError } from "../types/character.js";

const LIST_SELECT = {
  id: true,
  characterId: true,
  name: true,
  quantity: true,
  imagePath: true,
  createdAt: true,
} as const;

export class CharacterInventoryRepository {
  public static async list(characterId: string) {
    return prisma.characterInventoryItem.findMany({
      where: {
        characterId,
        quantity: {
          gt: 0,
        },
      },

      select: LIST_SELECT,

      orderBy: {
        createdAt: "asc",
      },
    });
  }

  public static async getById(id: string) {
    return prisma.characterInventoryItem.findUnique({
      where: {
        id,
      },

      select: LIST_SELECT,
    });
  }

  public static async findByKey(characterId: string, nameKey: string) {
    return prisma.characterInventoryItem.findUnique({
      where: {
        characterId_nameKey: {
          characterId,
          nameKey,
        },
      },

      select: LIST_SELECT,
    });
  }

  public static async give(
    characterId: string,
    name: string,
    nameKey: string,
    quantity: number,
    imagePath: string | null,
  ) {
    const image = imagePath ? { imagePath } : {};

    return prisma.characterInventoryItem.upsert({
      where: {
        characterId_nameKey: {
          characterId,
          nameKey,
        },
      },

      update: {
        quantity: {
          increment: quantity,
        },
        ...image,
      },

      create: {
        characterId,
        name,
        nameKey,
        quantity,
        ...image,
      },

      select: LIST_SELECT,
    });
  }

  public static async take(itemId: string, quantity: number) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.characterInventoryItem.updateMany({
        where: {
          id: itemId,
          quantity: {
            gte: quantity,
          },
        },

        data: {
          quantity: {
            decrement: quantity,
          },
        },
      });

      if (updated.count === 0) {
        throw new CharacterError("У персонажа нет столько предметов.");
      }

      const item = await tx.characterInventoryItem.findUniqueOrThrow({
        where: {
          id: itemId,
        },

        select: LIST_SELECT,
      });

      if (item.quantity <= 0) {
        await tx.characterInventoryItem.delete({
          where: {
            id: itemId,
          },
        });
      }

      return item;
    });
  }
}
