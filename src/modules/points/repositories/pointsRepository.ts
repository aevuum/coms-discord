import type { HousePointsSource } from "../../../database/generated/prisma/client.js";

import prisma from "../../../database/prisma.js";
import { HOUSES, type House, type PointsChange } from "../types/points.js";

export type PointsEntry = {
  guildId: string;
  actorId: string;
  source: HousePointsSource;
  messageId: string | null;
  channelId: string | null;
  note: string | null;
};

export class PointsRepository {
  public static async totals() {
    const rows = await prisma.housePoints.findMany();

    return HOUSES.map((faculty) => ({ faculty, points: rows.find((row) => row.faculty === faculty)?.points ?? 0 }));
  }

  public static apply(changes: PointsChange[], entry: PointsEntry) {
    return prisma.$transaction(async (tx) => {
      const existing = entry.messageId
        ? new Set((await tx.housePointsLog.findMany({ where: { messageId: entry.messageId }, select: { faculty: true } })).map((row) => row.faculty))
        : new Set<string>();

      const fresh = changes.filter((change) => !existing.has(change.faculty));

      for (const change of fresh) {
        await tx.housePointsLog.create({ data: { ...entry, faculty: change.faculty, delta: change.delta } });
        await tx.housePoints.upsert({
          where: { faculty: change.faculty },
          create: { faculty: change.faculty, points: change.delta },
          update: { points: { increment: change.delta } },
        });
      }

      return fresh;
    });
  }

  public static revert(messageId: string) {
    return prisma.$transaction(async (tx) => {
      const logs = await tx.housePointsLog.findMany({ where: { messageId } });

      if (!logs.length) {
        return [];
      }

      await tx.housePointsLog.deleteMany({ where: { messageId } });

      for (const log of logs) {
        await tx.housePoints.upsert({
          where: { faculty: log.faculty },
          create: { faculty: log.faculty, points: -log.delta },
          update: { points: { decrement: log.delta } },
        });
      }

      return logs.map((log) => ({ faculty: log.faculty as House, delta: log.delta }));
    });
  }

  public static reset() {
    return prisma.$transaction([
      prisma.housePoints.updateMany({ data: { points: 0 } }),
      prisma.housePointsLog.updateMany({ where: { messageId: { not: null } }, data: { messageId: null } }),
    ]);
  }

  public static recent(limit: number) {
    return prisma.housePointsLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  }

  public static settings(guildId: string) {
    return prisma.housePointsSettings.findUnique({ where: { guildId } });
  }

  public static allSettings() {
    return prisma.housePointsSettings.findMany();
  }

  public static saveSettings(guildId: string, data: { channelId?: string | null; messageId?: string | null }) {
    return prisma.housePointsSettings.upsert({ where: { guildId }, create: { guildId, ...data }, update: data });
  }
}
