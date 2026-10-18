import {
  AwardRarity,
  CoinTransactionType,
} from "../../../database/generated/prisma/enums.js";
import type { Award } from "../../../database/generated/prisma/client.js";
import { CoinRepository } from "../../coins/repositories/coinRepository.js";
import prisma from "../../../database/prisma.js";

export class AwardRepository {
  public static create(data: {
    label: string;
    emoji: string;
    description: string;
    rewardComsCoins: number;
    rarity: AwardRarity;
  }) {
    return prisma.award.create({
      data,
    });
  }

  public static findById(id: string) {
    return prisma.award.findUnique({
      where: {
        id,
      },
    });
  }

  public static findByLabel(label: string) {
    return prisma.award.findFirst({
      where: {
        label,
      },
    });
  }

  public static findAll() {
    return prisma.award.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  public static async delete(id: string) {
    await prisma.$transaction([
      prisma.userAward.deleteMany({
        where: {
          awardId: id,
        },
      }),
      prisma.user.updateMany({
        where: {
          selectedAwardId: id,
        },
        data: {
          selectedAwardId: null,
        },
      }),
      prisma.award.delete({
        where: {
          id,
        },
      }),
    ]);
  }

  public static findUserByDiscordId(discordId: string) {
    return prisma.user.findUnique({
      where: {
        discordId,
      },
      include: {
        wallet: true,
      },
    });
  }

  public static findUserAwards(userId: string) {
    return prisma.userAward.findMany({
      where: {
        userId,
      },
      include: {
        award: true,
      },
      orderBy: {
        issuedAt: "desc",
      },
    });
  }

  public static findUserAward(userId: string, awardId: string) {
    return prisma.userAward.findUnique({
      where: {
        userId_awardId: {
          userId,
          awardId,
        },
      },
    });
  }

  public static grant(
    userId: string,
    walletId: string,
    award: Pick<Award, "id" | "label" | "rewardComsCoins">,
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.userAward.create({
        data: {
          userId,
          awardId: award.id,
        },
      });

      if (award.rewardComsCoins > 0) {
        await CoinRepository.applyInTransaction(
          tx,
          userId,
          walletId,
          award.rewardComsCoins,
          CoinTransactionType.AWARD_GRANT,
          `Награда: ${award.label}`,
        );
      }
    });
  }

  public static revoke(
    userId: string,
    walletId: string,
    award: Pick<Award, "id" | "label" | "rewardComsCoins">,
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.userAward.delete({
        where: {
          userId_awardId: {
            userId,
            awardId: award.id,
          },
        },
      });

      const wallet = await tx.wallet.findUniqueOrThrow({
        where: {
          id: walletId,
        },
      });

      const deducted = Math.min(wallet.comsCoins, award.rewardComsCoins);

      if (deducted > 0) {
        await CoinRepository.applyInTransaction(
          tx,
          userId,
          walletId,
          -deducted,
          CoinTransactionType.AWARD_REVOKE,
          `Снятие награды: ${award.label}`,
        );
      }

      return deducted;
    });
  }
}
