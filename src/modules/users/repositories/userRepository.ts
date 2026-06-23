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
      },
    });
  }

  public static async updateBanner(
    discordId: string,
    bannerUrl: string | null,
  ) {
    return prisma.user.update({
      where: {
        discordId,
      },
      data: {
        profileBannerUrl: bannerUrl,
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
}
