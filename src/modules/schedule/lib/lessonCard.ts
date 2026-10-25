import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
} from "discord.js";

import { LessonStatus, type Character, type Lesson, type Subject } from "../../../database/generated/prisma/client.js";

import { CharacterFormatter } from "../../economy/lib/characterFormatter.js";
import type { LessonWithSubject } from "../types/schedule.js";
import { MoscowTime } from "./moscowTime.js";
import { LessonCardAction, REVIEW_FLAG, ScheduleAdminAction, ScheduleCustomIds } from "./scheduleCustomIds.js";

export const SCHEDULE_HEADER = "<:scroll:1562262856039145553>";
export const ARROW = "<:48765whitearrow:1518587298281685173>";
export const SUCCESS = "<:312537mark:1518581040548024430>";
export const ERROR = "<:240191mark:1518581039172292688>";
export const BACK = "<:26204blackarrow:1518587278467792997>";
export const WARNING = "<:warning_yellow:1562262858660708414>";
export const PAD = "⠀".repeat(60);

export const STATUS_DOTS: Record<LessonStatus, string> = {
  [LessonStatus.PENDING]: "<:dot_yellow:1562262864939589673>",
  [LessonStatus.APPROVED]: "<:dot_green:1562262861374423044>",
  [LessonStatus.REJECTED]: "<:caution_red:1562262870656552962>",
  [LessonStatus.CANCELLED]: "<:dot_white:1562262867846373436>",
};

export const STATUS_LABELS: Record<LessonStatus, string> = {
  [LessonStatus.PENDING]: "на проверке у администрации",
  [LessonStatus.APPROVED]: "утверждено",
  [LessonStatus.REJECTED]: "отклонено",
  [LessonStatus.CANCELLED]: "отменено",
};

const MAX_LISTED = 20;

export const subjectTitle = (subject: Subject) => `${subject.emoji ? `${subject.emoji} ` : ""}${subject.name}`;

export const text = (container: ContainerBuilder, lines: (string | null | false | undefined)[]) =>
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      lines.filter((line): line is string => typeof line === "string").join("\n").slice(0, 3400),
    ),
  );

const seats = (lesson: Lesson) =>
  lesson.capacity ? `${lesson.enrolledCount} / ${lesson.capacity}` : `${lesson.enrolledCount}`;

export class LessonCard {
  public static infoLines(lesson: LessonWithSubject) {
    return [
      `${ARROW} **Преподаватель:** <@${lesson.teacherId}>`,
      `${ARROW} **Кабинет:** <#${lesson.channelId}>`,
      `${ARROW} **Начало:** ${MoscowTime.format(lesson.startsAt)} МСК`,
      `-# ${MoscowTime.discord(lesson.startsAt)}`,
    ];
  }

  public static public(lesson: LessonWithSubject, students: string[], now = new Date()) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);
    const cancelled = lesson.status === LessonStatus.CANCELLED;
    const started = lesson.startsAt.getTime() <= now.getTime();

    text(container, [
      `# ${SCHEDULE_HEADER} ${subjectTitle(lesson.subject)}`,
      `### ${cancelled ? `~~${lesson.topic}~~` : lesson.topic}`,
      ...this.infoLines(lesson),
      `${ARROW} **Записались:** ${seats(lesson)}`,
      students.length
        ? `-# ${students.slice(0, MAX_LISTED).join(", ")}${students.length > MAX_LISTED ? ` и ещё ${students.length - MAX_LISTED}` : ""}`
        : null,
      cancelled ? `\n${ERROR} **Занятие отменено.**${lesson.cancelReason ? ` ${lesson.cancelReason}` : ""}` : null,
      !cancelled && started ? `\n-# Занятие началось, запись закрыта.` : null,
      `-# ${PAD}`,
    ]);

    if (!cancelled) {
      const full = lesson.capacity !== null && lesson.enrolledCount >= lesson.capacity;

      container.addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(ScheduleCustomIds.card(LessonCardAction.Join, lesson.id))
            .setLabel(full ? "Мест нет" : "Записаться")
            .setEmoji(SUCCESS)
            .setStyle(ButtonStyle.Success)
            .setDisabled(started || full),
          new ButtonBuilder()
            .setCustomId(ScheduleCustomIds.card(LessonCardAction.Leave, lesson.id))
            .setLabel("Отписаться")
            .setEmoji(ERROR)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(started),
        ),
      );
    }

    return container;
  }

  public static review(lesson: LessonWithSubject) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);
    const pending = lesson.status === LessonStatus.PENDING;

    text(container, [
      `# ${SCHEDULE_HEADER} Заявка на занятие`,
      `### ${subjectTitle(lesson.subject)} · ${lesson.topic}`,
      ...this.infoLines(lesson),
      `${ARROW} **Мест:** ${lesson.capacity ?? "без ограничений"}`,
      "",
      `${STATUS_DOTS[lesson.status]} **Статус:** ${STATUS_LABELS[lesson.status]}${lesson.reviewedById && !pending ? ` · <@${lesson.reviewedById}>` : ""}`,
      lesson.reviewReason && lesson.status === LessonStatus.REJECTED ? `-# Причина: ${lesson.reviewReason}` : null,
      `-# ${PAD}`,
    ]);

    if (pending) {
      container.addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(ScheduleCustomIds.admin(ScheduleAdminAction.Approve, lesson.id, REVIEW_FLAG))
            .setLabel("Утвердить")
            .setEmoji("<:checkmark_teal:1562262873902817401>")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(ScheduleCustomIds.admin(ScheduleAdminAction.Reject, lesson.id, REVIEW_FLAG))
            .setLabel("Отклонить")
            .setEmoji("<:12138cross:1518587259669053591>")
            .setStyle(ButtonStyle.Danger),
        ),
      );
    }

    return container;
  }

  public static characterPicker(lessonId: string, characters: Character[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    text(container, [`${ARROW} Каким персонажем записаться на занятие?`]);

    container.addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(ScheduleCustomIds.card(LessonCardAction.Pick, lessonId))
          .setPlaceholder("Выберите персонажа")
          .addOptions(
            characters.slice(0, 25).map((character) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(character.rpName.slice(0, 100))
                .setDescription(CharacterFormatter.facultyLabel(character.faculty))
                .setEmoji(CharacterFormatter.facultyEmoji(character.faculty))
                .setValue(character.id),
            ),
          ),
      ),
    );

    return container;
  }

  public static notice(title: string, lines: (string | null)[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    text(container, [`### ${title}`, ...lines]);

    return container;
  }

  public static success(message: string) {
    return this.notice(`${SUCCESS} Готово`, [message]);
  }

  public static error(message: string) {
    return this.notice(`${ERROR} Ошибка`, [message]);
  }

  public static reminder(lesson: LessonWithSubject, minutes: number, url: string | null) {
    return this.notice(`${SCHEDULE_HEADER} Скоро занятие`, [
      `Через ${minutes} мин. начнётся **${subjectTitle(lesson.subject)}** — ${lesson.topic}.`,
      ...this.infoLines(lesson),
      url ? `-# [Карточка занятия](${url})` : null,
    ]);
  }

  public static rescheduled(lesson: LessonWithSubject, url: string | null) {
    return this.notice(`${WARNING} Занятие перенесено`, [
      `**${subjectTitle(lesson.subject)}** — ${lesson.topic}.`,
      ...this.infoLines(lesson),
      "-# Ваша запись сохранена. Если новое время не подходит, отпишитесь в карточке занятия.",
      url ? `-# [Карточка занятия](${url})` : null,
    ]);
  }

  public static cancelled(lesson: LessonWithSubject) {
    return this.notice(`${ERROR} Занятие отменено`, [
      `**${subjectTitle(lesson.subject)}** — ${lesson.topic}, ${MoscowTime.format(lesson.startsAt)} МСК.`,
      lesson.cancelReason ? `> ${lesson.cancelReason}` : null,
    ]);
  }

  public static reviewed(lesson: LessonWithSubject) {
    const approved = lesson.status === LessonStatus.APPROVED;

    return this.notice(approved ? `${SUCCESS} Занятие утверждено` : `${ERROR} Занятие отклонено`, [
      `**${subjectTitle(lesson.subject)}** — ${lesson.topic}, ${MoscowTime.format(lesson.startsAt)} МСК.`,
      approved
        ? `Карточка опубликована в <#${lesson.channelId}>, ученики уже могут записываться.`
        : lesson.reviewReason
          ? `> ${lesson.reviewReason}`
          : null,
      approved ? null : "-# Исправьте занятие в /schedule — оно снова уйдёт на проверку.",
    ]);
  }
}
