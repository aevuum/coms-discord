import { LessonRepository } from "../repositories/lessonRepository.js";
import { LessonService } from "../service/lessonService.js";
import { ScheduleContainer } from "./scheduleContainer.js";

const HISTORY_DAYS = 30;

export class ScheduleView {
  public static async home(teacherId: string, notice: string | null = null) {
    const since = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000);

    return ScheduleContainer.home(teacherId, await LessonRepository.listForTeacher(teacherId, since), notice);
  }

  public static async lesson(teacherId: string, lessonId: string, notice: string | null = null) {
    return ScheduleContainer.lesson(await LessonService.owned(teacherId, lessonId), notice);
  }
}
