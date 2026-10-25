import {
  LessonStatus,
  Prisma,
} from "../../../database/generated/prisma/client.js";

import prisma from "../../../database/prisma.js";

export enum EnrollResult {
  Enrolled = "enrolled",
  AlreadyEnrolled = "already",
  Full = "full",
  Closed = "closed",
}

export class EnrollmentRepository {
  public static async enroll(lessonId: string, userId: string, characterId: string, now: Date) {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.lessonEnrollment.create({ data: { lessonId, userId, characterId } });

        const updated = await tx.lesson.updateMany({
          where: {
            id: lessonId,
            status: LessonStatus.APPROVED,
            startsAt: { gt: now },
            OR: [{ capacity: null }, { enrolledCount: { lt: prisma.lesson.fields.capacity } }],
          },
          data: { enrolledCount: { increment: 1 } },
        });

        if (!updated.count) {
          throw new EnrollmentRejected();
        }

        return EnrollResult.Enrolled;
      });
    } catch (error) {
      if (error instanceof EnrollmentRejected) {
        const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });

        return lesson?.status === LessonStatus.APPROVED && lesson.startsAt > now ? EnrollResult.Full : EnrollResult.Closed;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return EnrollResult.AlreadyEnrolled;
      }

      throw error;
    }
  }

  public static leave(lessonId: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const removed = await tx.lessonEnrollment.deleteMany({ where: { lessonId, userId } });

      if (!removed.count) {
        return false;
      }

      await tx.lesson.updateMany({
        where: { id: lessonId, enrolledCount: { gt: 0 } },
        data: { enrolledCount: { decrement: removed.count } },
      });

      return true;
    });
  }

  public static find(lessonId: string, userId: string) {
    return prisma.lessonEnrollment.findUnique({
      where: { lessonId_userId: { lessonId, userId } },
      include: { character: { select: { rpName: true } } },
    });
  }
}

class EnrollmentRejected extends Error {}
