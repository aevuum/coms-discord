import type { BaseInteraction } from "discord.js";

import { LessonStatus, type Subject } from "../../../database/generated/prisma/client.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { GradeMath } from "../lib/gradeMath.js";
import { MoscowTime } from "../lib/moscowTime.js";
import { GradeRepository } from "../repositories/gradeRepository.js";
import { ScheduleRepository } from "../repositories/scheduleRepository.js";
import {
  SCHEDULE_COMMAND,
  SCHEDULE_MANAGE_KEY,
  ScheduleError,
  type GradeDraft,
} from "../types/schedule.js";
import { LessonService } from "./lessonService.js";

export type SubjectReport = {
  subject: Subject;
  grades: { title: string; workType: string; value: number }[];
  average: number | null;
  attendance: { present: number; total: number };
};

export type ReportCard = {
  character: { id: string; rpName: string; ownerId: string };
  month: string;
  subjectId: string | null;
  subjects: SubjectReport[];
  average: number | null;
  attendance: { present: number; total: number };
};

const VIEW_KEYS = [SCHEDULE_COMMAND, SCHEDULE_MANAGE_KEY, "manage.characters"];

export class GradeService {
  public static async add(teacherId: string, lessonId: string, characterId: string, draft: GradeDraft) {
    const lesson = await LessonService.owned(teacherId, lessonId);

    if (lesson.status !== LessonStatus.APPROVED) {
      throw new ScheduleError("Оценки можно ставить только за утверждённое занятие.");
    }

    const enrollment = lesson.enrollments.find((entry) => entry.characterId === characterId);

    if (!enrollment) {
      throw new ScheduleError("Этот персонаж не записан на занятие.");
    }

    const title = draft.title.replace(/\s+/g, " ").trim().slice(0, 100);
    const workType = GradeMath.parseWorkType(draft.workType);
    const value = GradeMath.parseValue(draft.value);

    if (!title) {
      throw new ScheduleError("Укажите название работы.");
    }

    if (!workType || value === null) {
      throw new ScheduleError("Выберите тип работы и оценку от 1 до 5.");
    }

    await GradeRepository.create({
      characterId,
      subjectId: lesson.subjectId,
      lessonId: lesson.id,
      teacherId,
      title,
      workType,
      value,
    });

    return { name: enrollment.character.rpName, title, value };
  }

  public static async remove(teacherId: string, lessonId: string, gradeId: string) {
    const lesson = await LessonService.owned(teacherId, lessonId);

    if (!(await GradeRepository.deleteFromLesson(gradeId, lesson.id))) {
      throw new ScheduleError("Оценка уже удалена.");
    }
  }

  public static async assertCanView(interaction: BaseInteraction, ownerId: string) {
    if (interaction.user.id === ownerId) {
      return;
    }

    const subject = await PermissionService.resolveSubject(interaction);

    for (const key of VIEW_KEYS) {
      if (await PermissionService.canUse(subject, key)) {
        return;
      }
    }

    throw new ScheduleError("Чужой табель могут смотреть только преподаватели и администрация.");
  }

  public static async characters(ownerId: string) {
    return ScheduleRepository.allCharacters(ownerId);
  }

  public static async character(characterId: string) {
    const character = await ScheduleRepository.character(characterId);

    if (!character) {
      throw new ScheduleError("Персонаж не найден.");
    }

    return character;
  }

  public static async reportCard(characterId: string, month: string, subjectId: string | null): Promise<ReportCard> {
    const character = await this.character(characterId);
    const key = MoscowTime.isMonthKey(month) ? month : MoscowTime.monthKey(new Date());
    const { from, to } = MoscowTime.monthRange(key);

    const [grades, attendance] = await Promise.all([
      GradeRepository.forCharacter(character.id, from, to),
      GradeRepository.attendance(character.id, from, to),
    ]);

    const subjects = new Map<string, Subject>();

    for (const entry of grades) subjects.set(entry.subjectId, entry.subject);
    for (const entry of attendance) subjects.set(entry.lesson.subjectId, entry.lesson.subject);

    const reports = [...subjects.values()]
      .filter((subject) => !subjectId || subject.id === subjectId)
      .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name))
      .map((subject) => {
        const own = grades.filter((entry) => entry.subjectId === subject.id);

        return {
          subject,
          grades: own.map((entry) => ({ title: entry.title, workType: entry.workType, value: entry.value })),
          average: GradeMath.average(own.map((entry) => entry.value)),
          attendance: GradeMath.attendance(
            attendance
              .filter((entry) => entry.lesson.subjectId === subject.id)
              .map((entry) => ({ absent: entry.absent, startsAt: entry.lesson.startsAt })),
          ),
        };
      });

    const values = reports.flatMap((report) => report.grades.map((grade) => grade.value));

    return {
      character: { id: character.id, rpName: character.rpName, ownerId: character.user.discordId },
      month: key,
      subjectId,
      subjects: reports,
      average: GradeMath.average(values),
      attendance: reports.reduce(
        (sum, report) => ({ present: sum.present + report.attendance.present, total: sum.total + report.attendance.total }),
        { present: 0, total: 0 },
      ),
    };
  }
}
