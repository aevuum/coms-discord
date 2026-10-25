import {
  LessonStatus,
  Prisma,
  type LessonNotificationKind,
} from "../../../database/generated/prisma/client.js";

import prisma from "../../../database/prisma.js";
import { NotificationRepository } from "./notificationRepository.js";

const DETAILS_INCLUDE = {
  subject: true,
  enrollments: {
    orderBy: { createdAt: "asc" },
    include: { character: { select: { id: true, rpName: true } } },
  },
  grades: {
    orderBy: { gradedAt: "asc" },
    include: { character: { select: { rpName: true } } },
  },
} satisfies Prisma.LessonInclude;

export class LessonRepository {
  public static create(data: Prisma.LessonUncheckedCreateInput) {
    return prisma.lesson.create({ data, include: { subject: true } });
  }

  public static find(id: string) {
    return prisma.lesson.findUnique({ where: { id }, include: { subject: true } });
  }

  public static details(id: string) {
    return prisma.lesson.findUnique({ where: { id }, include: DETAILS_INCLUDE });
  }

  public static update(id: string, data: Prisma.LessonUncheckedUpdateInput) {
    return prisma.lesson.update({ where: { id }, data, include: { subject: true } });
  }

  public static async transition(
    id: string,
    from: LessonStatus[],
    data: Prisma.LessonUncheckedUpdateManyInput,
    extra: Prisma.LessonWhereInput = {},
  ) {
    const result = await prisma.lesson.updateMany({
      where: { id, status: { in: from }, ...extra },
      data,
    });

    return result.count > 0;
  }

  public static updateAndNotify(
    id: string,
    expected: LessonStatus[],
    data: Prisma.LessonUncheckedUpdateManyInput,
    notify: LessonNotificationKind | null,
    extra: Prisma.LessonWhereInput = {},
  ) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.lesson.updateMany({ where: { id, status: { in: expected }, ...extra }, data });

      if (!updated.count) {
        return null;
      }

      const lesson = await tx.lesson.findUniqueOrThrow({ where: { id }, include: { subject: true } });

      if (notify) {
        const enrollments = await tx.lessonEnrollment.findMany({ where: { lessonId: id }, select: { userId: true } });

        await NotificationRepository.enqueue(
          id,
          enrollments.map((entry) => entry.userId),
          notify,
          lesson.version,
          tx,
        );
      }

      return lesson;
    });
  }

  public static listForTeacher(teacherId: string, since: Date) {
    return prisma.lesson.findMany({
      where: {
        teacherId,
        OR: [{ startsAt: { gte: since } }, { status: LessonStatus.PENDING }],
      },
      orderBy: { startsAt: "asc" },
      take: 25,
      include: { subject: true },
    });
  }

  public static listForAdmin(guildId: string, now: Date) {
    return prisma.$transaction([
      prisma.lesson.findMany({
        where: { guildId, status: LessonStatus.PENDING },
        orderBy: { startsAt: "asc" },
        take: 12,
        include: { subject: true },
      }),
      prisma.lesson.findMany({
        where: { guildId, status: LessonStatus.APPROVED, startsAt: { gte: now } },
        orderBy: { startsAt: "asc" },
        take: 12,
        include: { subject: true },
      }),
    ]);
  }

  public static week(guildId: string, from: Date, to: Date, characterId: string) {
    return prisma.lesson.findMany({
      where: { guildId, status: LessonStatus.APPROVED, startsAt: { gte: from, lt: to } },
      orderBy: { startsAt: "asc" },
      include: { subject: true, enrollments: { where: { characterId }, select: { id: true } } },
    });
  }

  public static findStartingBetween(from: Date, to: Date) {
    return prisma.lesson.findMany({
      where: { status: LessonStatus.APPROVED, startsAt: { gt: from, lte: to } },
      include: { subject: true, enrollments: { select: { userId: true } } },
    });
  }

  public static async claimChannelReminder(id: string, version: number) {
    const result = await prisma.lesson.updateMany({
      where: { id, version, status: LessonStatus.APPROVED, channelReminderVersion: { lt: version } },
      data: { channelReminderVersion: version },
    });

    return result.count > 0;
  }

  public static enrolledUserIds(lessonId: string) {
    return prisma.lessonEnrollment
      .findMany({ where: { lessonId }, select: { userId: true } })
      .then((rows) => rows.map((row) => row.userId));
  }

  public static enrolledCharacterNames(lessonId: string) {
    return prisma.lessonEnrollment
      .findMany({
        where: { lessonId },
        orderBy: { createdAt: "asc" },
        select: { userId: true, character: { select: { rpName: true } } },
      })
      .then((rows) => rows.map((row) => ({ userId: row.userId, name: row.character.rpName })));
  }

  public static async setAbsent(lessonId: string, absentCharacterIds: string[]) {
    await prisma.$transaction([
      prisma.lessonEnrollment.updateMany({
        where: { lessonId, characterId: { in: absentCharacterIds } },
        data: { absent: true },
      }),
      prisma.lessonEnrollment.updateMany({
        where: { lessonId, characterId: { notIn: absentCharacterIds } },
        data: { absent: false },
      }),
    ]);
  }
}
