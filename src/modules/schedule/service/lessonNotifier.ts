import { container } from "@sapphire/framework";

import { DiscordAPIError, MessageFlags, type Client } from "discord.js";

import {
  LessonNotificationKind,
  LessonNotificationStatus,
  LessonStatus,
} from "../../../database/generated/prisma/client.js";

import { LessonCard, subjectTitle } from "../lib/lessonCard.js";
import { LessonRules } from "../lib/lessonRules.js";
import { MoscowTime } from "../lib/moscowTime.js";
import { LessonRepository } from "../repositories/lessonRepository.js";
import { NotificationRepository } from "../repositories/notificationRepository.js";
import { ScheduleRepository } from "../repositories/scheduleRepository.js";
import { MAX_REMINDER_MINUTES, type LessonWithSubject } from "../types/schedule.js";
import { LessonPublisher } from "./lessonPublisher.js";

const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 3;
const DEFAULT_REMINDER_MINUTES = 15;
const CANNOT_DM = 50007;

export class LessonNotifier {
  private static lastTick: Date | null = null;

  public static async tick(client: Client<true>) {
    const now = new Date();

    await this.planReminders(client, now);
    await this.refreshStarted(client, now);

    const sent = await this.deliver(client, now);

    this.lastTick = now;

    return sent;
  }

  public static prune() {
    return NotificationRepository.prune();
  }

  private static async planReminders(client: Client<true>, now: Date) {
    const settings = new Map((await ScheduleRepository.allSettings()).map((entry) => [entry.guildId, entry.reminderMinutes]));
    const lessons = await LessonRepository.findStartingBetween(now, new Date(now.getTime() + MAX_REMINDER_MINUTES * 60_000));

    for (const lesson of lessons) {
      const minutes = settings.get(lesson.guildId) ?? DEFAULT_REMINDER_MINUTES;

      if (!LessonRules.reminderDue(lesson.startsAt, minutes, now)) {
        continue;
      }

      await NotificationRepository.enqueue(
        lesson.id,
        lesson.enrollments.map((entry) => entry.userId),
        LessonNotificationKind.REMINDER,
        lesson.version,
      );

      if (lesson.enrollments.length && (await LessonRepository.claimChannelReminder(lesson.id, lesson.version))) {
        await this.pingChannel(client, lesson, lesson.enrollments.map((entry) => entry.userId)).catch((error) =>
          container.logger.error(error),
        );
      }
    }
  }

  private static async refreshStarted(client: Client<true>, now: Date) {
    if (!this.lastTick) {
      return;
    }

    const started = await LessonRepository.findStartingBetween(this.lastTick, now);

    for (const lesson of started) {
      await LessonPublisher.refreshCard(client, lesson.id).catch(() => null);
    }
  }

  private static async deliver(client: Client<true>, now: Date) {
    const candidates = await NotificationRepository.candidates(now, BATCH_SIZE);
    let sent = 0;

    for (const { id } of candidates) {
      const notification = await NotificationRepository.claim(id, now);

      if (!notification) {
        continue;
      }

      const { lesson } = notification;

      if (!this.stillRelevant(notification.kind, notification.version, lesson, now)) {
        await NotificationRepository.finish(id, LessonNotificationStatus.SKIPPED);
        continue;
      }

      try {
        await LessonPublisher.dm(client, notification.userId, await this.render(notification.kind, lesson));
        await NotificationRepository.finish(id, LessonNotificationStatus.SENT);
        sent++;
      } catch (error) {
        const permanent = error instanceof DiscordAPIError && error.code === CANNOT_DM;
        const message = error instanceof Error ? error.message : String(error);

        await NotificationRepository.finish(
          id,
          permanent || notification.attempts >= MAX_ATTEMPTS ? LessonNotificationStatus.FAILED : LessonNotificationStatus.PENDING,
          message,
        );
      }
    }

    return sent;
  }

  private static stillRelevant(kind: LessonNotificationKind, version: number, lesson: LessonWithSubject, now: Date) {
    switch (kind) {
      case LessonNotificationKind.CANCELLED:
        return lesson.status === LessonStatus.CANCELLED;
      case LessonNotificationKind.RESCHEDULED:
        return lesson.status === LessonStatus.APPROVED && lesson.version === version && lesson.startsAt > now;
      case LessonNotificationKind.REMINDER:
        return lesson.status === LessonStatus.APPROVED && lesson.version === version && lesson.startsAt > now;
    }
  }

  private static async render(kind: LessonNotificationKind, lesson: LessonWithSubject) {
    const url = LessonPublisher.messageUrl(lesson);

    switch (kind) {
      case LessonNotificationKind.CANCELLED:
        return LessonCard.cancelled(lesson);
      case LessonNotificationKind.RESCHEDULED:
        return LessonCard.rescheduled(lesson, url);
      case LessonNotificationKind.REMINDER:
        return LessonCard.reminder(lesson, Math.max(1, Math.round((lesson.startsAt.getTime() - Date.now()) / 60_000)), url);
    }
  }

  private static async pingChannel(client: Client<true>, lesson: LessonWithSubject, userIds: string[]) {
    const channel = await client.channels.fetch(lesson.channelId).catch(() => null);

    if (!channel?.isSendable()) {
      return;
    }

    await channel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [
        LessonCard.notice(`${subjectTitle(lesson.subject)} — скоро начало`, [
          `**${lesson.topic}** начнётся в ${MoscowTime.format(lesson.startsAt).slice(-5)} МСК (<t:${Math.floor(lesson.startsAt.getTime() / 1000)}:R>).`,
          userIds.map((userId) => `<@${userId}>`).join(" "),
        ]),
      ],
      allowedMentions: { users: userIds },
      reply: lesson.messageId ? { messageReference: lesson.messageId, failIfNotExists: false } : undefined,
    });
  }
}
