import { AwardRarity } from "../../../database/generated/prisma/enums.js";
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

  public static delete(id: string) {
    return prisma.award.delete({
      where: {
        id,
      },
    });
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

  public static createUserAward(userId: string, awardId: string) {
    return prisma.userAward.create({
      data: {
        userId,
        awardId,
      },
    });
  }

  public static deleteUserAward(userId: string, awardId: string) {
    return prisma.userAward.delete({
      where: {
        userId_awardId: {
          userId,
          awardId,
        },
      },
    });
  }

  public static addCoins(walletId: string, amount: number) {
    return prisma.wallet.update({
      where: {
        id: walletId,
      },
      data: {
        comsCoins: {
          increment: amount,
        },
      },
    });
  }

  public static removeCoins(walletId: string, amount: number) {
    return prisma.wallet.update({
      where: {
        id: walletId,
      },
      data: {
        comsCoins: {
          decrement: amount,
        },
      },
    });
  }

  public static transaction(queries: any[]) {
    return prisma.$transaction(queries);
  }
}
