import prisma from "../../../database/prisma.js";

import type {
  CoinTransactionType,
  Prisma,
} from "../../../database/generated/prisma/client.js";

export class CoinRepository {
  public static async ensureUser(tx: Prisma.TransactionClient, discordId: string) {
    return tx.user.upsert({
      where: {
        discordId,
      },

      update: {},

      create: {
        discordId,
        wallet: {
          create: {},
        },
      },
    });
  }

  public static async getBalance(discordId: string) {
    const user = await prisma.user.findUnique({
      where: {
        discordId,
      },

      include: {
        wallet: true,
      },
    });

    return user?.wallet.comsCoins ?? 0;
  }

  public static async getHistory(discordId: string, take = 8) {
    return prisma.coinTransaction.findMany({
      where: {
        user: {
          discordId,
        },
      },

      orderBy: {
        createdAt: "desc",
      },

      take,
    });
  }

  public static async adjust(
    discordId: string,
    amount: number,
    type: CoinTransactionType,
    reason: string | null,
  ) {
    return prisma.$transaction(async (tx) => {
      const user = await this.ensureUser(tx, discordId);

      return this.applyInTransaction(tx, user.id, user.walletId, amount, type, reason);
    });
  }

  public static async applyInTransaction(
    tx: Prisma.TransactionClient,
    userId: string,
    walletId: string,
    amount: number,
    type: CoinTransactionType,
    reason: string | null,
  ) {
    const updated = await tx.wallet.updateMany({
      where: {
        id: walletId,
        ...(amount < 0 ? { comsCoins: { gte: -amount } } : {}),
      },

      data: {
        comsCoins: {
          increment: amount,
        },
      },
    });

    if (updated.count === 0) {
      return null;
    }

    const wallet = await tx.wallet.findUniqueOrThrow({
      where: {
        id: walletId,
      },
    });

    await tx.coinTransaction.create({
      data: {
        userId,
        type,
        amount,
        balanceAfter: wallet.comsCoins,
        reason,
      },
    });

    return wallet.comsCoins;
  }
}
