import { container } from "@sapphire/framework";

import type { BaseInteraction, Client } from "discord.js";

import {
  LessonNotificationKind,
  LessonStatus,
} from "../../../database/generated/prisma/client.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { LessonCard } from "../lib/lessonCard.js";
import { LessonRules } from "../lib/lessonRules.js";
import { MoscowTime } from "../lib/moscowTime.js";
import { LessonRepository } from "../repositories/lessonRepository.js";
import { ScheduleRepository } from "../repositories/scheduleRepository.js";
import {
  SCHEDULE_COMMAND,
  SCHEDULE_MANAGE_KEY,
  ScheduleError,
  type LessonDraft,
  type LessonWithSubject,
} from "../types/schedule.js";
import { LessonPublisher } from "./lessonPublisher.js";

const CHANGED = "Занятие уже изменилось — откройте его заново.";

export class LessonService {
  public static async assertTeacher(interaction: BaseInteraction) {
    const subject = await PermissionService.resolveSubject(interaction);

    if (!subject.guildId || !(await PermissionService.canUse(subject, SCHEDULE_COMMAND))) {
      throw new ScheduleError("Расписание доступно только преподавателям.");
    }

    return subject.guildId;
  }

  public static async assertAdmin(interaction: BaseInteraction) {
    const subject = await PermissionService.resolveSubject(interaction);

    if (!subject.guildId || !(await PermissionService.canUse(subject, SCHEDULE_MANAGE_KEY))) {
      throw new ScheduleError("У вас нет доступа к утверждению занятий.");
    }

    return subject.guildId;
  }

  public static async canReview(interaction: BaseInteraction) {
    const subject = await PermissionService.resolveSubject(interaction);

    return PermissionService.canUse(subject, SCHEDULE_MANAGE_KEY);
  }

  public static async get(id: string) {
    const lesson = await LessonRepository.find(id);

    if (!lesson) {
      throw new ScheduleError("Занятие не найдено.");
    }

    return lesson;
  }

  public static async details(id: string) {
    const lesson = await LessonRepository.details(id);

    if (!lesson) {
      throw new ScheduleError("Занятие не найдено.");
    }

    return lesson;
  }

  public static async owned(teacherId: string, id: string) {
    const lesson = await this.details(id);

    if (lesson.teacherId !== teacherId) {
      throw new ScheduleError("Это занятие ведёт другой преподаватель.");
    }

    return lesson;
  }

  public static async create(client: Client, guildId: string, teacherId: string, draft: LessonDraft) {
    const subject = draft.subjectId ? await ScheduleRepository.subject(draft.subjectId) : null;

    if (!subject?.active) {
      throw new ScheduleError("Выберите предмет из списка.");
    }

    if (!draft.channelId) {
      throw new ScheduleError("Выберите кабинет — канал, где пройдёт занятие.");
    }

    const topic = LessonRules.topic(draft.topic);
    const startsAt = LessonRules.startsAt(draft.startsAt);
    const capacity = LessonRules.capacity(draft.capacity);

    await LessonPublisher.assertChannel(client, guildId, draft.channelId);

    const lesson = await LessonRepository.create({
      guildId,
      teacherId,
      subjectId: subject.id,
      topic,
      channelId: draft.channelId,
      startsAt,
      capacity,
    });

    await LessonPublisher.syncReview(client, lesson).catch((error) => container.logger.error(error));

    return lesson;
  }

  public static async update(client: Client, teacherId: string, id: string, draft: LessonDraft) {
    const lesson = await this.owned(teacherId, id);
    const now = new Date();

    if (lesson.status === LessonStatus.CANCELLED) {
      throw new ScheduleError("Отменённое занятие изменить нельзя.");
    }

    if (lesson.status === LessonStatus.APPROVED && lesson.startsAt <= now) {
      throw new ScheduleError("Занятие уже началось — изменить его нельзя.");
    }

    const channelId = draft.channelId ?? lesson.channelId;
    const topic = LessonRules.topic(draft.topic);
    const capacity = LessonRules.capacity(draft.capacity, lesson.enrolledCount);
    const parsed = MoscowTime.parse(draft.startsAt, now);
    const timeChanged = !parsed || parsed.getTime() !== lesson.startsAt.getTime();
    const startsAt = timeChanged ? LessonRules.startsAt(draft.startsAt, now) : lesson.startsAt;

    if (channelId !== lesson.channelId) {
      await LessonPublisher.assertChannel(client, lesson.guildId, channelId);
    }

    const approved = lesson.status === LessonStatus.APPROVED;

    const updated = await LessonRepository.updateAndNotify(
      lesson.id,
      [lesson.status],
      {
        topic,
        capacity,
        channelId,
        startsAt,
        ...(approved
          ? timeChanged
            ? { version: { increment: 1 } }
            : {}
          : { status: LessonStatus.PENDING, reviewReason: null, reviewedById: null, reviewedAt: null }),
      },
      approved && timeChanged ? LessonNotificationKind.RESCHEDULED : null,
      capacity === null ? {} : { enrolledCount: { lte: capacity } },
    );

    if (!updated) {
      throw new ScheduleError(CHANGED);
    }

    if (!approved) {
      await LessonPublisher.syncReview(client, updated).catch((error) => container.logger.error(error));
      return { lesson: updated, rescheduled: false };
    }

    if (channelId !== lesson.channelId) {
      await LessonPublisher.removeCard(client, lesson.channelId, lesson.messageId);
      await LessonRepository.update(lesson.id, { messageId: null });
      await LessonPublisher.publish(client, updated).catch((error) => container.logger.error(error));
    }

    await LessonPublisher.refreshCard(client, lesson.id).catch((error) => container.logger.error(error));

    return { lesson: updated, rescheduled: timeChanged };
  }

  public static async cancel(client: Client, id: string, reason: string, teacherId: string | null) {
    const lesson = teacherId ? await this.owned(teacherId, id) : await this.details(id);

    if (lesson.status === LessonStatus.CANCELLED) {
      throw new ScheduleError("Занятие уже отменено.");
    }

    if (lesson.status === LessonStatus.APPROVED && lesson.startsAt <= new Date()) {
      throw new ScheduleError("Занятие уже началось — отменить его нельзя.");
    }

    const cancelled = await LessonRepository.updateAndNotify(
      lesson.id,
      [lesson.status],
      { status: LessonStatus.CANCELLED, cancelReason: reason.trim().slice(0, 300) || null },
      lesson.status === LessonStatus.APPROVED ? LessonNotificationKind.CANCELLED : null,
    );

    if (!cancelled) {
      throw new ScheduleError(CHANGED);
    }

    await LessonPublisher.refreshCard(client, lesson.id).catch((error) => container.logger.error(error));
    await LessonPublisher.syncReview(client, cancelled).catch((error) => container.logger.error(error));

    return cancelled;
  }

  public static async approve(client: Client, id: string, actorId: string) {
    const lesson = await this.get(id);

    if (lesson.status !== LessonStatus.PENDING) {
      throw new ScheduleError("Это занятие уже рассмотрено.");
    }

    if (lesson.startsAt <= new Date()) {
      throw new ScheduleError("Время занятия уже прошло — преподавателю нужно перенести его.");
    }

    const claimed = await LessonRepository.transition(lesson.id, [LessonStatus.PENDING], {
      status: LessonStatus.APPROVED,
      reviewedById: actorId,
      reviewedAt: new Date(),
      reviewReason: null,
    });

    if (!claimed) {
      throw new ScheduleError("Это занятие уже рассмотрено.");
    }

    const approved = await this.get(lesson.id);

    try {
      await LessonPublisher.publish(client, approved);
    } catch (error) {
      await LessonRepository.transition(lesson.id, [LessonStatus.APPROVED], {
        status: LessonStatus.PENDING,
        reviewedById: null,
        reviewedAt: null,
      });

      throw error instanceof ScheduleError
        ? error
        : new ScheduleError(`Не удалось опубликовать карточку в <#${lesson.channelId}>. Проверьте права бота.`);
    }

    await this.afterReview(client, approved);

    return approved;
  }

  public static async reject(client: Client, id: string, actorId: string, reason: string) {
    const claimed = await LessonRepository.transition(id, [LessonStatus.PENDING], {
      status: LessonStatus.REJECTED,
      reviewedById: actorId,
      reviewedAt: new Date(),
      reviewReason: reason.trim().slice(0, 500) || null,
    });

    if (!claimed) {
      throw new ScheduleError("Это занятие уже рассмотрено.");
    }

    const rejected = await this.get(id);

    await this.afterReview(client, rejected);

    return rejected;
  }

  public static async markAbsent(teacherId: string, id: string, absentCharacterIds: string[]) {
    const lesson = await this.owned(teacherId, id);

    if (lesson.status !== LessonStatus.APPROVED || lesson.startsAt > new Date()) {
      throw new ScheduleError("Отмечать посещаемость можно после начала утверждённого занятия.");
    }

    const enrolled = new Set(lesson.enrollments.map((entry) => entry.characterId));

    await LessonRepository.setAbsent(
      lesson.id,
      absentCharacterIds.filter((characterId) => enrolled.has(characterId)),
    );
  }

  private static async afterReview(client: Client, lesson: LessonWithSubject) {
    await LessonPublisher.syncReview(client, lesson).catch((error) => container.logger.error(error));
    await LessonPublisher.dm(client, lesson.teacherId, LessonCard.reviewed(lesson)).catch(() => null);
  }
}
