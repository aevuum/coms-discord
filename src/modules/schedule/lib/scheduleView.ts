import { AttachmentBuilder, type BaseInteraction, type GuildMember } from "discord.js";

import { CharacterFaculty, LessonStatus } from "../../../database/generated/prisma/client.js";

import { LessonRepository } from "../repositories/lessonRepository.js";
import { LessonService } from "../service/lessonService.js";
import { ScheduleContainer } from "./scheduleContainer.js";
import { TIMETABLE_FILE, TimetableCard } from "./timetableCard.js";
import { MAX_WEEK_OFFSET, WEEK_MS } from "./timetableView.js";

const HISTORY_DAYS = 30;

export class ScheduleView {
  public static teacherName(interaction: BaseInteraction) {
    const member = interaction.member as GuildMember | null;

    return member?.displayName ?? interaction.user.displayName;
  }

  public static async home(interaction: BaseInteraction, notice: string | null = null, offset = 0) {
    const teacherId = interaction.user.id;
    const week = Math.max(-MAX_WEEK_OFFSET, Math.min(MAX_WEEK_OFFSET, Number.isInteger(offset) ? offset : 0));
    const weekStart = new Date(TimetableCard.weekStart(new Date()).getTime() + week * WEEK_MS);
    const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000);

    const [lessons, weekLessons] = await Promise.all([
      LessonRepository.listForTeacher(teacherId, since),
      LessonRepository.teacherWeek(teacherId, weekStart, new Date(weekStart.getTime() + WEEK_MS)),
    ]);

    const image = await TimetableCard.render({
      faculty: CharacterFaculty.ADULT,
      title: "Преподаватель",
      ownerName: this.teacherName(interaction),
      weekStart,
      legend: "teacher",
      lessons: weekLessons.map((lesson) => ({
        startsAt: lesson.startsAt,
        subjectId: lesson.subjectId,
        subjectName: lesson.subject.name,
        note:
          lesson.status === LessonStatus.PENDING
            ? "на проверке"
            : `записались: ${lesson.capacity ? `${lesson.enrolledCount} из ${lesson.capacity}` : lesson.enrolledCount}`,
        enrolled: false,
        faded: lesson.status === LessonStatus.PENDING,
      })),
    });

    return {
      components: [ScheduleContainer.home(lessons, week, weekLessons, notice)],
      files: [new AttachmentBuilder(image, { name: TIMETABLE_FILE })],
    };
  }

  public static weekOffset(date: Date) {
    return Math.round((TimetableCard.weekStart(date).getTime() - TimetableCard.weekStart(new Date()).getTime()) / WEEK_MS);
  }

  public static async lesson(teacherId: string, lessonId: string, notice: string | null = null) {
    return ScheduleContainer.lesson(await LessonService.owned(teacherId, lessonId), notice);
  }
}
