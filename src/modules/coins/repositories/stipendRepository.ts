import prisma from "../../../database/prisma.js";

import { CoinTransactionType } from "../../../database/generated/prisma/client.js";

import { CoinRepository } from "./coinRepository.js";

export class StipendRepository {
  public static async list(guildId: string) {
    return prisma.roleStipend.findMany({
      where: {
        guildId,
      },

      orderBy: {
        createdAt: "asc",
      },
    });
  }

  public static async listAll() {
    return prisma.roleStipend.findMany();
  }

  public static async getById(id: string) {
    return prisma.roleStipend.findUnique({
      where: {
        id,
      },
    });
  }

  public static async upsert(guildId: string, roleId: string, amount: number) {
    return prisma.roleStipend.upsert({
      where: {
        guildId_roleId: {
          guildId,
          roleId,
        },
      },

      update: {
        amount,
      },

      create: {
        guildId,
        roleId,
        amount,
        lastPaidAt: new Date(),
      },
    });
  }

  public static async delete(id: string) {
    return prisma.roleStipend.delete({
      where: {
        id,
      },
    });
  }

  public static async pay(
    stipendId: string,
    expectedLastPaidAt: Date | null,
    discordIds: string[],
    amount: number,
    reason: string,
  ) {
    return prisma.$transaction(
      async (tx) => {
        const claimed = await tx.roleStipend.updateMany({
          where: {
            id: stipendId,
            lastPaidAt: expectedLastPaidAt,
          },

          data: {
            lastPaidAt: new Date(),
          },
        });

        if (claimed.count === 0) {
          return 0;
        }

        for (const discordId of discordIds) {
          const user = await CoinRepository.ensureUser(tx, discordId);

          await CoinRepository.applyInTransaction(
            tx,
            user.id,
            user.walletId,
            amount,
            CoinTransactionType.STIPEND,
            reason,
          );
        }

        return discordIds.length;
      },
      {
        timeout: 60_000,
      },
    );
  }
}
