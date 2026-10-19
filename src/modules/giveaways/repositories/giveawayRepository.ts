import prisma from "../../../database/prisma.js";

export class GiveawayRepository {
  public static create(data: {
    guildId: string;
    channelId: string;
    hostId: string;
    prize: string;
    description: string | null;
    imagePath: string | null;
    winnerCount: number;
    endsAt: Date;
  }) {
    return prisma.giveaway.create({ data });
  }

  public static findById(id: string) {
    return prisma.giveaway.findUnique({ where: { id } });
  }

  public static delete(id: string) {
    return prisma.giveaway.delete({ where: { id } }).catch(() => null);
  }

  public static setMessage(id: string, messageId: string) {
    return prisma.giveaway.update({ where: { id }, data: { messageId } });
  }

  public static listForAdmin(guildId: string) {
    return prisma.$transaction([
      prisma.giveaway.findMany({
        where: { guildId, status: "ACTIVE" },
        orderBy: { endsAt: "asc" },
        take: 15,
      }),
      prisma.giveaway.findMany({
        where: { guildId, status: { not: "ACTIVE" } },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
    ]);
  }

  public static findDue() {
    return prisma.giveaway.findMany({
      where: { status: "ACTIVE", endsAt: { lte: new Date() } },
      take: 20,
    });
  }

  public static async claimEnd(id: string) {
    const result = await prisma.giveaway.updateMany({
      where: { id, status: "ACTIVE" },
      data: { status: "ENDED", endedAt: new Date() },
    });

    return result.count > 0;
  }

  public static async cancel(id: string) {
    const result = await prisma.giveaway.updateMany({
      where: { id, status: "ACTIVE" },
      data: { status: "CANCELLED", endedAt: new Date() },
    });

    return result.count > 0;
  }

  public static setWinners(id: string, winnerIds: string[]) {
    return prisma.giveaway.update({ where: { id }, data: { winnerIds } });
  }

  public static async toggleEntry(giveawayId: string, userId: string) {
    const existing = await prisma.giveawayEntry.findUnique({
      where: { giveawayId_userId: { giveawayId, userId } },
    });

    if (existing) {
      await prisma.giveawayEntry.deleteMany({ where: { giveawayId, userId } });

      return false;
    }

    await prisma.giveawayEntry.create({ data: { giveawayId, userId } }).catch(() => null);

    return true;
  }

  public static countEntries(giveawayId: string) {
    return prisma.giveawayEntry.count({ where: { giveawayId } });
  }

  public static async entryIds(giveawayId: string) {
    const entries = await prisma.giveawayEntry.findMany({
      where: { giveawayId },
      select: { userId: true },
    });

    return entries.map((entry) => entry.userId);
  }

  public static getSettings(guildId: string) {
    return prisma.giveawaySettings.findUnique({ where: { guildId } });
  }

  public static updateSettings(guildId: string, data: { channelId?: string | null; pingRoleId?: string | null }) {
    return prisma.giveawaySettings.upsert({
      where: { guildId },
      create: { guildId, ...data },
      update: data,
    });
  }
}
