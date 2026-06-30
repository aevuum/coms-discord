import prisma from "../../../database/prisma.js";

import { TransactionType } from "../../../database/generated/prisma/client.js";

export class TransactionRepository {
  public static async create(
    characterId: string,
    type: TransactionType,
    amountKnuts: number,
    balanceAfterKnuts: number,
    reason?: string,
  ) {
    return prisma.characterTransaction.create({
      data: {
        characterId,
        type,

        amountKnuts,

        balanceAfterKnuts: balanceAfterKnuts,

        reason,
      },
    });
  }

  public static async getHistory(characterId: string, take = 15) {
    return prisma.characterTransaction.findMany({
      where: {
        characterId,
      },

      orderBy: {
        createdAt: "desc",
      },

      take,
    });
  }
}
