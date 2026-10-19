import type { ReportStatus } from "../../../database/generated/prisma/client.js";
import prisma from "../../../database/prisma.js";

export class ReportRepository {
  public static findById(id: string) {
    return prisma.report.findUnique({ where: { id } });
  }

  public static create(data: {
    guildId: string;
    reporterId: string;
    targetId: string;
    reason: string | null;
    description: string;
    channelId: string | null;
    messageId: string | null;
    messageContent: string | null;
    images: string[];
  }) {
    return prisma.report.create({ data });
  }

  public static setStaffMessage(id: string, staffMessageId: string) {
    return prisma.report.update({ where: { id }, data: { staffMessageId } });
  }

  public static delete(id: string) {
    return prisma.report.delete({ where: { id } }).catch(() => null);
  }

  public static async take(id: string, reviewerId: string) {
    const result = await prisma.report.updateMany({
      where: { id, status: "OPEN" },
      data: { status: "REVIEWING", reviewerId },
    });

    return result.count > 0;
  }

  public static async close(id: string, reviewerId: string, status: ReportStatus) {
    const result = await prisma.report.updateMany({
      where: { id, status: { in: ["OPEN", "REVIEWING"] } },
      data: { status, reviewerId, closedAt: new Date() },
    });

    return result.count > 0;
  }

  public static countAgainst(targetId: string) {
    return prisma.report.count({ where: { targetId } });
  }
}
