import { container } from "@sapphire/framework";

import { ChannelFlags, MessageFlags, PermissionFlagsBits, type Client, type ContainerBuilder } from "discord.js";

import { LessonStatus } from "../../../database/generated/prisma/client.js";

import { LessonCard } from "../lib/lessonCard.js";
import { LessonRepository } from "../repositories/lessonRepository.js";
import { ScheduleRepository } from "../repositories/scheduleRepository.js";
import { ScheduleError, type LessonWithSubject } from "../types/schedule.js";

const REFRESH_DELAY_MS = 3_000;

export class LessonPublisher {
  private static refreshTimers = new Map<string, NodeJS.Timeout>();

  public static messageUrl(lesson: { guildId: string; channelId: string; messageId: string | null }) {
    return lesson.messageId ? `https://discord.com/channels/${lesson.guildId}/${lesson.channelId}/${lesson.messageId}` : null;
  }

  public static async assertChannel(client: Client, guildId: string, channelId: string) {
    const channel = await client.channels.fetch(channelId).catch(() => null);

    if (!channel || channel.isDMBased() || channel.guildId !== guildId || (!channel.isThreadOnly() && !channel.isSendable())) {
      throw new ScheduleError("Этот канал не подходит для занятия: выберите текстовый канал, ветку или форум сервера.");
    }

    const me = channel.guild.members.me;
    const permissions = me ? channel.permissionsFor(me) : null;
    const send = channel.isThread() ? PermissionFlagsBits.SendMessagesInThreads : PermissionFlagsBits.SendMessages;

    if (!permissions?.has([PermissionFlagsBits.ViewChannel, send])) {
      throw new ScheduleError(`У бота нет права писать в <#${channelId}>.`);
    }

    if (channel.isThread() && channel.locked && !permissions.has(PermissionFlagsBits.ManageThreads)) {
      throw new ScheduleError(`Ветка <#${channelId}> закрыта — бот не сможет опубликовать в ней занятие.`);
    }

    return channel;
  }

  public static async publish(client: Client, lesson: LessonWithSubject) {
    const channel = await this.assertChannel(client, lesson.guildId, lesson.channelId);
    const card = {
      flags: MessageFlags.IsComponentsV2 as const,
      components: [LessonCard.public(lesson, [])],
      allowedMentions: { parse: [] },
    };

    if (channel.isThreadOnly()) {
      const thread = await channel.threads.create({
        name: `${lesson.subject.name}: ${lesson.topic}`.slice(0, 100),
        appliedTags: channel.flags.has(ChannelFlags.RequireTag) && channel.availableTags.length ? [channel.availableTags[0].id] : [],
        message: card,
      });

      return LessonRepository.update(lesson.id, { channelId: thread.id, messageId: thread.id });
    }

    if (channel.isThread() && channel.archived) {
      await channel.setArchived(false).catch(() => null);
    }

    if (!channel.isSendable()) {
      throw new ScheduleError("Этот канал не подходит для занятия.");
    }

    const message = await channel.send(card);

    return LessonRepository.update(lesson.id, { messageId: message.id });
  }

  public static async removeCard(client: Client, channelId: string, messageId: string | null) {
    if (!messageId) {
      return;
    }

    const channel = await client.channels.fetch(channelId).catch(() => null);

    if (channel?.isTextBased() && !channel.isDMBased()) {
      await channel.messages.delete(messageId).catch(() => null);
    }
  }

  public static async refreshCard(client: Client, lessonId: string) {
    const lesson = await LessonRepository.find(lessonId);

    if (!lesson?.messageId) {
      return;
    }

    const students = await LessonRepository.enrolledCharacterNames(lesson.id);

    await this.edit(client, lesson.channelId, lesson.messageId, LessonCard.public(lesson, students.map((entry) => entry.name)));
  }

  public static scheduleRefresh(lessonId: string) {
    if (this.refreshTimers.has(lessonId)) {
      return;
    }

    const timer = setTimeout(() => {
      this.refreshTimers.delete(lessonId);

      void this.refreshCard(container.client, lessonId).catch((error) => container.logger.error(error));
    }, REFRESH_DELAY_MS);

    timer.unref();

    this.refreshTimers.set(lessonId, timer);
  }

  public static async syncReview(client: Client, lesson: LessonWithSubject) {
    const settings = await ScheduleRepository.settings(lesson.guildId);

    if (lesson.reviewMessageId && settings?.reviewChannelId) {
      const edited = await this.edit(client, settings.reviewChannelId, lesson.reviewMessageId, LessonCard.review(lesson));

      if (edited || lesson.status !== LessonStatus.PENDING) {
        return;
      }
    }

    if (lesson.status !== LessonStatus.PENDING || !settings?.reviewChannelId) {
      return;
    }

    const channel = await client.channels.fetch(settings.reviewChannelId).catch(() => null);

    if (!channel?.isSendable()) {
      container.logger.warn(`Schedule review channel ${settings.reviewChannelId} is not available`);
      return;
    }

    const message = await channel
      .send({
        flags: MessageFlags.IsComponentsV2,
        components: [LessonCard.review(lesson)],
        allowedMentions: { parse: [] },
      })
      .catch((error) => {
        container.logger.error(error);
        return null;
      });

    if (message) {
      await LessonRepository.update(lesson.id, { reviewMessageId: message.id });
    }
  }

  public static async dm(client: Client, userId: string, component: ContainerBuilder) {
    const user = await client.users.fetch(userId);

    await user.send({ flags: MessageFlags.IsComponentsV2, components: [component] });
  }

  private static async edit(client: Client, channelId: string, messageId: string, component: ContainerBuilder) {
    const channel = await client.channels.fetch(channelId).catch(() => null);

    if (!channel?.isTextBased() || channel.isDMBased()) {
      return false;
    }

    const message = await channel.messages.fetch(messageId).catch(() => null);

    if (!message) {
      return false;
    }

    return message
      .edit({ flags: MessageFlags.IsComponentsV2, components: [component], allowedMentions: { parse: [] } })
      .then(() => true)
      .catch(() => false);
  }
}
