import prisma from "../../../database/prisma.js";

export class UserRepository {
  public static async getByDiscordId(discordId: string) {
    return prisma.user.findUnique({
      where: {
        discordId,
      },
      include: {
        wallet: true,

        awards: {
          include: {
            award: true,
          },
        },

        characters: {
          orderBy: {
            createdAt: "asc",
          },
        },

        inventory: {
          where: {
            quantity: {
              gt: 0,
            },
          },
          include: {
            shopItem: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  }

  public static async create(discordId: string) {
    return prisma.user.create({
      data: {
        discordId,

        wallet: {
          create: {},
        },
      },
      include: {
        wallet: true,

        awards: {
          include: {
            award: true,
          },
        },

        characters: true,

        inventory: {
          where: {
            quantity: {
              gt: 0,
            },
          },
          include: {
            shopItem: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  }

  public static async updateBanner(discordId: string, bannerPath: string) {
    return prisma.user.update({
      where: {
        discordId,
      },
      data: {
        profileBannerPath: bannerPath,
        profileBannerUrl: null,
      },
    });
  }

  public static async updateSelectedAward(
    discordId: string,
    awardId: string | null,
  ) {
    return prisma.user.update({
      where: {
        discordId,
      },
      data: {
        selectedAwardId: awardId,
      },
    });
  }

  public static async incrementMessageCount(discordId: string): Promise<void> {
    await prisma.user.upsert({
      where: { discordId },
      update: { messagesCount: { increment: 1 }, weeklyMessages: { increment: 1 } },
      create: { discordId, messagesCount: 1, weeklyMessages: 1, wallet: { create: {} } },
    });
  }

  public static async addVoiceSeconds(
    discordId: string,
    seconds: number,
  ): Promise<void> {
    await prisma.user.upsert({
      where: { discordId },
      update: {
        voiceSeconds: { increment: seconds },
        weeklyVoiceSeconds: { increment: seconds },
      },
      create: {
        discordId,
        voiceSeconds: seconds,
        weeklyVoiceSeconds: seconds,
        wallet: { create: {} },
      },
    });
  }
}
