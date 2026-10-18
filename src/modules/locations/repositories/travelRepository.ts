import prisma from "../../../database/prisma.js";

export class TravelRepository {
  public static findByUser(userId: string) {
    return prisma.travel.findUnique({ where: { userId } });
  }

  public static findById(id: string) {
    return prisma.travel.findUnique({ where: { id } });
  }

  public static createPending(data: {
    guildId: string;
    userId: string;
    fromId: string | null;
    toId: string;
    routeId: string;
  }) {
    return prisma.travel.create({ data: { ...data, status: "PENDING" } });
  }

  public static createTraveling(data: {
    guildId: string;
    userId: string;
    fromId: string | null;
    toId: string;
    routeId: string;
    arrivesAt: Date;
  }) {
    return prisma.travel.upsert({
      where: { userId: data.userId },
      update: { ...data, status: "TRAVELING", requestMessageId: null },
      create: { ...data, status: "TRAVELING" },
    });
  }

  public static setRequestMessage(id: string, requestMessageId: string) {
    return prisma.travel.update({ where: { id }, data: { requestMessageId } });
  }

  public static async claimPending(id: string) {
    const result = await prisma.travel.deleteMany({ where: { id, status: "PENDING" } });

    return result.count > 0;
  }

  public static async claim(id: string) {
    const result = await prisma.travel.deleteMany({ where: { id } });

    return result.count > 0;
  }

  public static listArrived(now: Date) {
    return prisma.travel.findMany({
      where: { status: "TRAVELING", arrivesAt: { lte: now } },
    });
  }

  public static deleteByUser(userId: string) {
    return prisma.travel.deleteMany({ where: { userId } });
  }

  public static findPayer(discordId: string, itemKey: string, quantity: number) {
    return prisma.characterInventoryItem.findFirst({
      where: {
        nameKey: itemKey,
        quantity: { gte: quantity },
        character: { status: "ALIVE", user: { discordId } },
      },
      include: { character: true },
      orderBy: { createdAt: "asc" },
    });
  }

  public static countAliveCharacters(discordId: string, adultOnly: boolean) {
    return prisma.character.count({
      where: {
        status: "ALIVE",
        user: { discordId },
        ...(adultOnly ? { faculty: "ADULT" as const } : {}),
      },
    });
  }
}
