import { LessonStatus } from "../../../database/generated/prisma/client.js";

import { subjectTitle } from "../lib/lessonCard.js";
import { EnrollmentRepository, EnrollResult } from "../repositories/enrollmentRepository.js";
import { ScheduleRepository } from "../repositories/scheduleRepository.js";
import { ScheduleError } from "../types/schedule.js";
import { LessonPublisher } from "./lessonPublisher.js";
import { LessonService } from "./lessonService.js";

export class EnrollmentService {
  public static async start(userId: string, lessonId: string) {
    const lesson = await this.open(lessonId);
    const existing = await EnrollmentRepository.find(lesson.id, userId);

    if (existing) {
      throw new ScheduleError(`Вы уже записаны на это занятие персонажем **${existing.character.rpName}**.`);
    }

    const characters = await ScheduleRepository.ownCharacters(userId);

    if (!characters.length) {
      throw new ScheduleError("Записаться можно только живым персонажем, а у вас таких нет.");
    }

    if (characters.length === 1) {
      return { message: await this.enroll(userId, lesson.id, characters[0].id), characters: null };
    }

    return { message: null, characters };
  }

  public static async enroll(userId: string, lessonId: string, characterId: string) {
    const lesson = await this.open(lessonId);
    const character = (await ScheduleRepository.ownCharacters(userId)).find((entry) => entry.id === characterId);

    if (!character) {
      throw new ScheduleError("Этот персонаж вам не принадлежит или не может посещать занятия.");
    }

    const result = await EnrollmentRepository.enroll(lesson.id, userId, character.id, new Date());

    switch (result) {
      case EnrollResult.AlreadyEnrolled:
        throw new ScheduleError("Вы уже записаны на это занятие.");
      case EnrollResult.Full:
        throw new ScheduleError("Свободных мест на занятии не осталось.");
      case EnrollResult.Closed:
        throw new ScheduleError("Запись на это занятие закрыта.");
    }

    LessonPublisher.scheduleRefresh(lesson.id);

    return `**${character.rpName}** записан(а) на **${subjectTitle(lesson.subject)}** — ${lesson.topic}. Напоминание придёт в личные сообщения перед началом.`;
  }

  public static async leave(userId: string, lessonId: string) {
    const lesson = await LessonService.get(lessonId);

    if (lesson.startsAt <= new Date()) {
      throw new ScheduleError("Занятие уже началось — отписаться нельзя.");
    }

    if (!(await EnrollmentRepository.leave(lesson.id, userId))) {
      throw new ScheduleError("Вы не записаны на это занятие.");
    }

    LessonPublisher.scheduleRefresh(lesson.id);

    return `Вы отписались от занятия **${subjectTitle(lesson.subject)}** — ${lesson.topic}.`;
  }

  private static async open(lessonId: string) {
    const lesson = await LessonService.get(lessonId);

    if (lesson.status !== LessonStatus.APPROVED) {
      throw new ScheduleError(lesson.status === LessonStatus.CANCELLED ? "Это занятие отменено." : "Запись на это занятие ещё не открыта.");
    }

    if (lesson.startsAt <= new Date()) {
      throw new ScheduleError("Занятие уже началось, запись закрыта.");
    }

    return lesson;
  }
}
