import { LessonRepository } from "../repositories/lessonRepository.js";
import { ScheduleRepository } from "../repositories/scheduleRepository.js";
import { LessonService } from "../service/lessonService.js";
import { SubjectService } from "../service/subjectService.js";
import { ScheduleAdminContainer } from "./scheduleAdminContainer.js";

export class ScheduleAdminViews {
  public static async root(guildId: string, notice: string | null = null) {
    const [[pending, upcoming], settings, subjects] = await Promise.all([
      LessonRepository.listForAdmin(guildId, new Date()),
      ScheduleRepository.settings(guildId),
      ScheduleRepository.subjects(true),
    ]);

    return ScheduleAdminContainer.root(pending, upcoming, settings, subjects.length, notice);
  }

  public static async lesson(lessonId: string, notice: string | null = null) {
    return ScheduleAdminContainer.lesson(await LessonService.details(lessonId), notice);
  }

  public static async subjects(notice: string | null = null) {
    return ScheduleAdminContainer.subjects(await ScheduleRepository.subjects(true), notice);
  }

  public static async subject(subjectId: string, notice: string | null = null) {
    return ScheduleAdminContainer.subject(await SubjectService.get(subjectId), notice);
  }
}
