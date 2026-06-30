import prisma from "../../../database/prisma.js";

export class EconomyRepository {
  public static async getCharacter(id: string) {
    return prisma.character.findUnique({
      where: {
        id,
      },
    });
  }

  public static async getUserCharacters(userId: string) {
    return prisma.character.findMany({
      where: {
        userId,
      },

      orderBy: {
        createdAt: "asc",
      },
    });
  }

  public static async updateBalance(characterId: string, balanceKnuts: number) {
    return prisma.character.update({
      where: {
        id: characterId,
      },

      data: {
        balanceKnuts,
      },
    });
  }

  public static async transfer(
    fromCharacterId: string,
    toCharacterId: string,
    amountKnuts: number,
  ) {
    return prisma.$transaction(async (tx) => {
      const sender = await tx.character.update({
        where: {
          id: fromCharacterId,
        },

        data: {
          balanceKnuts: {
            decrement: amountKnuts,
          },
        },
      });

      const receiver = await tx.character.update({
        where: {
          id: toCharacterId,
        },

        data: {
          balanceKnuts: {
            increment: amountKnuts,
          },
        },
      });

      return {
        sender,
        receiver,
      };
    });
  }

  public static async getCharactersByIds(ids: string[]) {
    return prisma.character.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }
}
