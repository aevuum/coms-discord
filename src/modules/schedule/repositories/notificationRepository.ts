import {
  LessonNotificationKind,
  LessonNotificationStatus,
  Prisma,
} from "../../../database/generated/prisma/client.js";

import prisma from "../../../database/prisma.js";

const STALE_LOCK_MS = 5 * 60 * 1000;
const RETENTION_DAYS = 30;

type Client = Prisma.TransactionClient | typeof prisma;

export class NotificationRepository {
  public static async enqueue(
    lessonId: string,
    userIds: string[],
    kind: LessonNotificationKind,
    version: number,
    client: Client = prisma,
  ) {
    if (!userIds.length) {
      return 0;
    }

    const result = await client.lessonNotification.createMany({
      data: userIds.map((userId) => ({ lessonId, userId, kind, version })),
      skipDuplicates: true,
    });

    return result.count;
  }

  private static claimable(now: Date): Prisma.LessonNotificationWhereInput {
    return {
      OR: [
        { status: LessonNotificationStatus.PENDING },
        { status: LessonNotificationStatus.SENDING, lockedAt: { lt: new Date(now.getTime() - STALE_LOCK_MS) } },
      ],
    };
  }

  public static candidates(now: Date, limit: number) {
    return prisma.lessonNotification.findMany({
      where: this.claimable(now),
      orderBy: { createdAt: "asc" },
      take: limit,
      select: { id: true },
    });
  }

  public static async claim(id: string, now: Date) {
    const result = await prisma.lessonNotification.updateMany({
      where: { id, ...this.claimable(now) },
      data: { status: LessonNotificationStatus.SENDING, lockedAt: now, attempts: { increment: 1 } },
    });

    if (!result.count) {
      return null;
    }

    return prisma.lessonNotification.findUnique({
      where: { id },
      include: { lesson: { include: { subject: true } } },
    });
  }

  public static finish(id: string, status: LessonNotificationStatus, error: string | null = null) {
    return prisma.lessonNotification.update({
      where: { id },
      data: {
        status,
        error: error?.slice(0, 500) ?? null,
        lockedAt: null,
        sentAt: status === LessonNotificationStatus.SENT ? new Date() : null,
      },
    });
  }

  public static prune() {
    return prisma.lessonNotification.deleteMany({
      where: {
        status: { in: [LessonNotificationStatus.SENT, LessonNotificationStatus.SKIPPED, LessonNotificationStatus.FAILED] },
        createdAt: { lt: new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000) },
      },
    });
  }
}
