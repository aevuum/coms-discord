import {
  LessonStatus,
  type GradeWorkType,
} from "../../../database/generated/prisma/client.js";

import prisma from "../../../database/prisma.js";

export class GradeRepository {
  public static create(data: {
    characterId: string;
    subjectId: string;
    lessonId: string;
    teacherId: string;
    title: string;
    workType: GradeWorkType;
    value: number;
  }) {
    return prisma.characterGrade.create({ data });
  }

  public static async deleteFromLesson(id: string, lessonId: string) {
    const result = await prisma.characterGrade.deleteMany({ where: { id, lessonId } });

    return result.count > 0;
  }

  public static forCharacter(characterId: string, from: Date, to: Date) {
    return prisma.characterGrade.findMany({
      where: { characterId, gradedAt: { gte: from, lt: to } },
      orderBy: { gradedAt: "asc" },
      include: { subject: true },
    });
  }

  public static attendance(characterId: string, from: Date, to: Date) {
    return prisma.lessonEnrollment.findMany({
      where: {
        characterId,
        lesson: { status: LessonStatus.APPROVED, startsAt: { gte: from, lt: to } },
      },
      select: {
        absent: true,
        lesson: { select: { startsAt: true, subjectId: true, subject: true } },
      },
    });
  }
}
