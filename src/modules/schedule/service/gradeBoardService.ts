import { container } from "@sapphire/framework";

import { AttachmentBuilder, MessageFlags, PermissionFlagsBits, type Client } from "discord.js";

import type { Subject } from "../../../database/generated/prisma/client.js";

import { BOARD_FILE, BOARD_PAGE_SIZE, GradeBoardContainer, type BoardStudent } from "../lib/gradeBoardContainer.js";
import { GradeCard } from "../lib/gradeCard.js";
import { GradeMath } from "../lib/gradeMath.js";
import { MoscowTime } from "../lib/moscowTime.js";
import { GradeRepository } from "../repositories/gradeRepository.js";
import { ScheduleRepository } from "../repositories/scheduleRepository.js";
import { ScheduleError } from "../types/schedule.js";
import { LessonPublisher } from "./lessonPublisher.js";

const REFRESH_DELAY_MS = 10_000;

export class GradeBoardService {
  private static refreshTimers = new Map<string, NodeJS.Timeout>();

  private static lastKeys = new Map<string, string>();

  public static async students(month: string): Promise<BoardStudent[]> {
    const { from, to } = MoscowTime.monthRange(month);
    const students = await GradeRepository.students();
    const ids = students.map((student) => student.id);

    const [grades, attendance] = await Promise.all([
      GradeRepository.monthGrades(ids, from, to),
      GradeRepository.monthAttendance(ids, from, to),
    ]);

    return students.map((student) => {
      const own = grades.filter((entry) => entry.characterId === student.id);
      const subjects = new Map<string, { subject: Subject; values: number[] }>();

      for (const entry of own) {
        const bucket = subjects.get(entry.subject.id) ?? { subject: entry.subject, values: [] };
        bucket.values.push(entry.value);
        subjects.set(entry.subject.id, bucket);
      }

      return {
        ...student,
        average: GradeMath.average(own.map((entry) => entry.value)),
        grades: own.length,
        subjects: [...subjects.values()]
          .sort((left, right) => left.subject.sortOrder - right.subject.sortOrder || left.subject.name.localeCompare(right.subject.name))
          .map((entry) => ({ subject: entry.subject, average: GradeMath.average(entry.values) ?? 0 })),
        attendance: GradeMath.attendance(
          attendance
            .filter((entry) => entry.characterId === student.id)
            .map((entry) => ({ absent: entry.absent, startsAt: entry.lesson.startsAt })),
        ),
      };
    });
  }

  public static async render(month: string, page: number, personal: boolean) {
    const students = await this.students(month);
    const pages = GradeBoardContainer.pages(students.length);
    const current = Math.min(Math.max(Number.isInteger(page) ? page : 0, 0), pages - 1);
    const slice = students.slice(current * BOARD_PAGE_SIZE, (current + 1) * BOARD_PAGE_SIZE);
    const key = JSON.stringify([month, current, pages, slice]);

    return {
      key,
      build: async () => ({
        components: [GradeBoardContainer.page(month, current, pages, personal)],
        files: [new AttachmentBuilder(await GradeCard.board(slice, month, current, pages, students.length), { name: BOARD_FILE })],
      }),
    };
  }

  public static async setChannel(client: Client, guildId: string, channelId: string | null) {
    const settings = await ScheduleRepository.settings(guildId);

    if (settings?.gradesChannelId === channelId && (settings.gradesMessageId || !channelId)) {
      if (channelId) {
        this.lastKeys.delete(guildId);
        await this.refresh(client, guildId);
      }

      return;
    }

    if (settings?.gradesChannelId && settings.gradesMessageId) {
      await LessonPublisher.removeCard(client, settings.gradesChannelId, settings.gradesMessageId);
    }

    if (!channelId) {
      await ScheduleRepository.saveSettings(guildId, { gradesChannelId: null, gradesMessageId: null });
      return;
    }

    const channel = await LessonPublisher.assertChannel(client, guildId, channelId);

    if (!channel.isSendable()) {
      throw new ScheduleError("Для табеля выберите текстовый канал или ветку.");
    }

    const me = channel.guild.members.me;

    if (!me || !channel.permissionsFor(me)?.has(PermissionFlagsBits.AttachFiles)) {
      throw new ScheduleError(`У бота нет права «Прикреплять файлы» в <#${channelId}> — без него ведомость-картинку не отправить.`);
    }

    const board = await this.render(MoscowTime.monthKey(new Date()), 0, false);
    const message = await channel.send({
      flags: MessageFlags.IsComponentsV2,
      ...(await board.build()),
      allowedMentions: { parse: [] },
    });

    this.lastKeys.set(guildId, board.key);

    await ScheduleRepository.saveSettings(guildId, { gradesChannelId: channelId, gradesMessageId: message.id });
  }

  public static scheduleRefresh(guildId: string) {
    if (this.refreshTimers.has(guildId)) {
      return;
    }

    const timer = setTimeout(() => {
      this.refreshTimers.delete(guildId);

      void this.refresh(container.client, guildId).catch((error) => container.logger.error(error));
    }, REFRESH_DELAY_MS);

    timer.unref();

    this.refreshTimers.set(guildId, timer);
  }

  public static async refreshAll(client: Client) {
    for (const settings of await ScheduleRepository.allSettings()) {
      if (settings.gradesChannelId) {
        await this.refresh(client, settings.guildId).catch((error) => container.logger.error(error));
      }
    }
  }

  private static async refresh(client: Client, guildId: string) {
    const settings = await ScheduleRepository.settings(guildId);

    if (!settings?.gradesChannelId) {
      return;
    }

    const board = await this.render(MoscowTime.monthKey(new Date()), 0, false);
    const channel = await client.channels.fetch(settings.gradesChannelId).catch(() => null);

    if (!channel?.isTextBased() || channel.isDMBased() || !channel.isSendable()) {
      return;
    }

    const message = settings.gradesMessageId ? await channel.messages.fetch(settings.gradesMessageId).catch(() => null) : null;

    if (message) {
      if (this.lastKeys.get(guildId) === board.key) {
        return;
      }

      await message.edit({ flags: MessageFlags.IsComponentsV2, ...(await board.build()), attachments: [], allowedMentions: { parse: [] } });
      this.lastKeys.set(guildId, board.key);
      return;
    }

    const sent = await channel.send({ flags: MessageFlags.IsComponentsV2, ...(await board.build()), allowedMentions: { parse: [] } });

    this.lastKeys.set(guildId, board.key);
    await ScheduleRepository.saveSettings(guildId, { gradesMessageId: sent.id });
  }
}
