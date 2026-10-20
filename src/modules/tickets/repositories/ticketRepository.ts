import prisma from "../../../database/prisma.js";

export class TicketRepository {
  public static findOpen(ownerId: string, tagId: string) {
    return prisma.ticket.findFirst({
      where: { ownerId, tagId, status: "OPEN" },
    });
  }

  public static findOpenByOwner(guildId: string, ownerId: string) {
    return prisma.ticket.findMany({
      where: { guildId, ownerId, status: "OPEN" },
    });
  }

  public static findAllOpen(guildId: string) {
    return prisma.ticket.findMany({
      where: { guildId, status: "OPEN" },
    });
  }

  public static findById(id: string) {
    return prisma.ticket.findUnique({ where: { id } });
  }

  public static findByChannel(channelId: string) {
    return prisma.ticket.findUnique({ where: { channelId } });
  }

  public static findRecentClosed(guildId: string) {
    return prisma.ticket.findMany({
      where: { guildId, status: "CLOSED" },
      orderBy: { closedAt: "desc" },
      take: 50,
    });
  }

  public static create(data: {
    guildId: string;
    channelId: string;
    ownerId: string;
    tagId: string;
    subject: string;
    paidSlot: boolean;
  }) {
    return prisma.ticket.create({ data });
  }

  public static async claimCall(id: string, cooldownMs: number) {
    const now = new Date();

    const result = await prisma.ticket.updateMany({
      where: {
        id,
        status: "OPEN",
        OR: [
          { lastCalledAt: null },
          { lastCalledAt: { lte: new Date(now.getTime() - cooldownMs) } },
        ],
      },
      data: { lastCalledAt: now },
    });

    return result.count > 0;
  }

  public static setStaffMessage(id: string, staffMessageId: string) {
    return prisma.ticket.update({ where: { id }, data: { staffMessageId } });
  }

  public static setReviewer(id: string, reviewerId: string | null) {
    return prisma.ticket.update({ where: { id }, data: { reviewerId } });
  }

  public static async close(id: string, closedById: string | null) {
    const result = await prisma.ticket.updateMany({
      where: { id, status: "OPEN" },
      data: { status: "CLOSED", closedById, closedAt: new Date() },
    });

    return result.count > 0;
  }
}
