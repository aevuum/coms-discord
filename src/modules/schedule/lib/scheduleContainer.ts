import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ContainerBuilder,
  LabelBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ModalBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import { GradeWorkType, LessonStatus, type Subject } from "../../../database/generated/prisma/client.js";

import type { LessonDetails, LessonWithSubject } from "../types/schedule.js";
import { MAX_GRADE, MIN_GRADE, WORK_TYPE_LABELS } from "./gradeMath.js";
import {
  ARROW,
  BACK,
  ERROR,
  LessonCard,
  PAD,
  SCHEDULE_HEADER,
  STATUS_DOTS,
  STATUS_LABELS,
  SUCCESS,
  subjectTitle,
  text,
} from "./lessonCard.js";
import { ChannelField } from "./channelField.js";
import { MoscowTime } from "./moscowTime.js";
import { TIMETABLE_FILE } from "./timetableCard.js";
import { MAX_WEEK_OFFSET } from "./timetableView.js";
import { ScheduleAction, ScheduleCustomIds, ScheduleFields } from "./scheduleCustomIds.js";

const EDIT = "<:12784editor:1518587261707616407>";
const DELETE = "<:14605delete:1518587266505642074>";
const ADD = "<:6509addguild:1518587247769817088>";
const FEATHER = "<:teal_feather:1562262848598577284>";

export const lessonLine = (lesson: LessonWithSubject) =>
  `${STATUS_DOTS[lesson.status]} **${MoscowTime.format(lesson.startsAt)}** · ${subjectTitle(lesson.subject)} — ${lesson.topic}`;

export const lessonOption = (lesson: LessonWithSubject) =>
  new StringSelectMenuOptionBuilder()
    .setLabel(`${MoscowTime.format(lesson.startsAt)} · ${lesson.subject.name}`.slice(0, 100))
    .setDescription(`${lesson.topic} · ${STATUS_LABELS[lesson.status]}`.slice(0, 100))
    .setEmoji(STATUS_DOTS[lesson.status])
    .setValue(lesson.id);

const input = (id: string, style: TextInputStyle, required: boolean, max: number, placeholder: string, value?: string) => {
  const field = new TextInputBuilder().setCustomId(id).setStyle(style).setRequired(required).setMaxLength(max).setPlaceholder(placeholder);

  return value ? field.setValue(value) : field;
};

export const LESSON_CHANNEL_TYPES = [
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
  ChannelType.PublicThread,
  ChannelType.PrivateThread,
  ChannelType.AnnouncementThread,
  ChannelType.GuildForum,
  ChannelType.GuildVoice,
];

const roomField = (current: string | null, inGuild: boolean) =>
  ChannelField.label({
    id: ScheduleFields.Channel,
    label: "Кабинет",
    description: "Канал, активная ветка или форум — в форуме бот создаст пост занятия",
    placeholder: "Канал, ветка или форум, где пройдёт занятие",
    types: LESSON_CHANNEL_TYPES,
    current,
    required: !current,
    inGuild,
    empty: current ? "оставить прежний" : undefined,
  });

export class ScheduleContainer {
  public static home(lessons: LessonWithSubject[], week: number, weekLessons: LessonWithSubject[], notice: string | null = null) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);
    const pending = weekLessons.filter((lesson) => lesson.status === LessonStatus.PENDING).length;

    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(`attachment://${TIMETABLE_FILE}`).setDescription("Расписание преподавателя на неделю"),
      ),
    );

    text(container, [
      notice ? `${SUCCESS} ${notice}` : null,
      `-# Занятий на неделе: **${weekLessons.length}**${pending ? `, на проверке: **${pending}**` : ""}. Новое занятие появится в расписании сразу, а в кабинете — после утверждения. Откройте занятие, чтобы изменить его, отметить посещаемость и выставить оценки.`,
    ]);

    if (lessons.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(ScheduleCustomIds.teacher(ScheduleAction.Open))
            .setPlaceholder("Открыть занятие")
            .addOptions(lessons.slice(0, 25).map(lessonOption)),
        ),
      );
    }

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(ScheduleCustomIds.teacher(ScheduleAction.Create))
          .setLabel("Новое занятие")
          .setEmoji(ADD)
          .setStyle(ButtonStyle.Primary),
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(ScheduleCustomIds.teacher(ScheduleAction.Home, week - 1))
          .setLabel("Прошлая неделя")
          .setEmoji(BACK)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(week <= -MAX_WEEK_OFFSET),
        new ButtonBuilder()
          .setCustomId(ScheduleCustomIds.teacher(ScheduleAction.Home, 0, "now"))
          .setLabel("Эта неделя")
          .setStyle(week === 0 ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(week === 0),
        new ButtonBuilder()
          .setCustomId(ScheduleCustomIds.teacher(ScheduleAction.Home, week + 1))
          .setLabel("Следующая неделя")
          .setEmoji("<:48765whitearrow:1518587298281685173>")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(week >= MAX_WEEK_OFFSET),
      ),
    );

    return container;
  }

  public static lesson(lesson: LessonDetails, notice: string | null = null, now = new Date()) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);
    const started = lesson.startsAt.getTime() <= now.getTime();
    const approved = lesson.status === LessonStatus.APPROVED;
    const editable = lesson.status !== LessonStatus.CANCELLED && !(approved && started);

    this.details(container, lesson, notice);

    if (approved && lesson.enrollments.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(ScheduleCustomIds.teacher(ScheduleAction.GradePick, lesson.id))
            .setPlaceholder("Выставить оценку ученику")
            .addOptions(
              lesson.enrollments.slice(0, 25).map((entry) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(entry.character.rpName.slice(0, 100))
                  .setEmoji(FEATHER)
                  .setValue(entry.characterId),
              ),
            ),
        ),
      );

      if (started) {
        container.addActionRowComponents(
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(ScheduleCustomIds.teacher(ScheduleAction.Absent, lesson.id))
              .setPlaceholder("Отметить отсутствовавших (пусто — были все)")
              .setMinValues(0)
              .setMaxValues(Math.min(lesson.enrollments.length, 25))
              .addOptions(
                lesson.enrollments.slice(0, 25).map((entry) =>
                  new StringSelectMenuOptionBuilder()
                    .setLabel(entry.character.rpName.slice(0, 100))
                    .setValue(entry.characterId)
                    .setDefault(entry.absent),
                ),
              ),
          ),
        );
      }
    }

    if (lesson.grades.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(ScheduleCustomIds.teacher(ScheduleAction.GradeDelete, lesson.id))
            .setPlaceholder("Удалить ошибочную оценку")
            .addOptions(
              lesson.grades.slice(-25).map((grade) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(`${grade.character.rpName} · ${grade.value}`.slice(0, 100))
                  .setDescription(`${grade.title} · ${WORK_TYPE_LABELS[grade.workType]}`.slice(0, 100))
                  .setEmoji(DELETE)
                  .setValue(grade.id),
              ),
            ),
        ),
      );
    }

    const row = new ActionRowBuilder<ButtonBuilder>();

    if (editable) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(ScheduleCustomIds.teacher(ScheduleAction.Edit, lesson.id))
          .setLabel(lesson.status === LessonStatus.REJECTED ? "Исправить и отправить снова" : "Изменить / перенести")
          .setEmoji(EDIT)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(ScheduleCustomIds.teacher(ScheduleAction.Cancel, lesson.id))
          .setLabel("Отменить занятие")
          .setEmoji(DELETE)
          .setStyle(ButtonStyle.Danger),
      );
    }

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(ScheduleCustomIds.teacher(ScheduleAction.Home))
        .setLabel("К расписанию")
        .setEmoji(BACK)
        .setStyle(ButtonStyle.Secondary),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addActionRowComponents(row);

    return container;
  }

  public static details(container: ContainerBuilder, lesson: LessonDetails, notice: string | null) {
    const absent = lesson.enrollments.filter((entry) => entry.absent).length;

    text(container, [
      `# ${SCHEDULE_HEADER} ${subjectTitle(lesson.subject)}`,
      `### ${lesson.topic}`,
      ...LessonCard.infoLines(lesson),
      `${ARROW} **Мест:** ${lesson.capacity ? `${lesson.enrolledCount} / ${lesson.capacity}` : `${lesson.enrolledCount} · без ограничений`}`,
      `${STATUS_DOTS[lesson.status]} **Статус:** ${STATUS_LABELS[lesson.status]}`,
      lesson.status === LessonStatus.REJECTED && lesson.reviewReason ? `-# Причина: ${lesson.reviewReason}` : null,
      lesson.status === LessonStatus.CANCELLED && lesson.cancelReason ? `-# Причина: ${lesson.cancelReason}` : null,
      notice ? `${SUCCESS} ${notice}` : null,
    ]);

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    text(container, [
      `### Ученики${absent ? ` · отсутствовали ${absent}` : ""}`,
      lesson.enrollments.length
        ? lesson.enrollments
            .map((entry) => {
              const grades = lesson.grades.filter((grade) => grade.characterId === entry.characterId);

              return `${entry.absent ? ERROR : ARROW} **${entry.character.rpName}** · <@${entry.userId}>${grades.length ? ` · оценки: ${grades.map((grade) => `**${grade.value}**`).join(", ")}` : ""}`;
            })
            .join("\n")
        : "-# Пока никто не записался.",
      `-# ${PAD}`,
    ]);
  }

  public static createModal(subjects: Subject[], inGuild: boolean) {
    return new ModalBuilder()
      .setCustomId(ScheduleCustomIds.teacher(ScheduleAction.CreateModal))
      .setTitle("Новое занятие")
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Предмет")
          .setStringSelectMenuComponent(
            new StringSelectMenuBuilder()
              .setCustomId(ScheduleFields.Subject)
              .setRequired(true)
              .addOptions(
                subjects.slice(0, 25).map((subject) => {
                  const option = new StringSelectMenuOptionBuilder().setLabel(subject.name.slice(0, 100)).setValue(subject.id);

                  return subject.emoji ? option.setEmoji(subject.emoji) : option;
                }),
              ),
          ),
        new LabelBuilder()
          .setLabel("Тема урока")
          .setTextInputComponent(input(ScheduleFields.Topic, TextInputStyle.Short, true, 150, "Невербальные чары")),
        new LabelBuilder()
          .setLabel("Дата и время начала (МСК)")
          .setDescription("Формат: ДД.ММ.ГГГГ ЧЧ:ММ. Год можно не указывать")
          .setTextInputComponent(input(ScheduleFields.StartsAt, TextInputStyle.Short, true, 20, "25.10.2026 19:00")),
        roomField(null, inGuild),
        new LabelBuilder()
          .setLabel("Количество мест")
          .setDescription("Пусто — без ограничений")
          .setTextInputComponent(input(ScheduleFields.Capacity, TextInputStyle.Short, false, 3, "15")),
      );
  }

  public static editModal(lesson: LessonWithSubject, inGuild: boolean) {
    return new ModalBuilder()
      .setCustomId(ScheduleCustomIds.teacher(ScheduleAction.EditModal, lesson.id))
      .setTitle(`${lesson.subject.name} · изменение`.slice(0, 45))
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Тема урока")
          .setTextInputComponent(input(ScheduleFields.Topic, TextInputStyle.Short, true, 150, "Тема", lesson.topic)),
        new LabelBuilder()
          .setLabel("Дата и время начала (МСК)")
          .setDescription("Если изменить время, записавшимся придёт уведомление о переносе")
          .setTextInputComponent(
            input(ScheduleFields.StartsAt, TextInputStyle.Short, true, 20, "25.10.2026 19:00", MoscowTime.format(lesson.startsAt)),
          ),
        roomField(lesson.channelId, inGuild),
        new LabelBuilder()
          .setLabel("Количество мест")
          .setDescription("Пусто — без ограничений")
          .setTextInputComponent(
            input(ScheduleFields.Capacity, TextInputStyle.Short, false, 3, "15", lesson.capacity ? String(lesson.capacity) : undefined),
          ),
      );
  }

  public static reasonModal(customId: string, title: string, label: string, required: boolean) {
    return new ModalBuilder()
      .setCustomId(customId)
      .setTitle(title.slice(0, 45))
      .addLabelComponents(
        new LabelBuilder()
          .setLabel(label)
          .setTextInputComponent(input(ScheduleFields.Reason, TextInputStyle.Paragraph, required, 300, "Причина увидят записавшиеся")),
      );
  }

  public static gradeModal(lesson: LessonDetails, characterId: string) {
    const name = lesson.enrollments.find((entry) => entry.characterId === characterId)?.character.rpName ?? "Ученик";

    return new ModalBuilder()
      .setCustomId(ScheduleCustomIds.teacher(ScheduleAction.GradeModal, lesson.id, characterId))
      .setTitle(`Оценка · ${name}`.slice(0, 45))
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Работа")
          .setTextInputComponent(input(ScheduleFields.Title, TextInputStyle.Short, true, 100, "Основы чар", lesson.topic.slice(0, 100))),
        new LabelBuilder()
          .setLabel("Тип работы")
          .setStringSelectMenuComponent(
            new StringSelectMenuBuilder()
              .setCustomId(ScheduleFields.WorkType)
              .setRequired(true)
              .addOptions(
                Object.values(GradeWorkType).map((type) =>
                  new StringSelectMenuOptionBuilder().setLabel(WORK_TYPE_LABELS[type]).setValue(type).setDefault(type === GradeWorkType.THEORY),
                ),
              ),
          ),
        new LabelBuilder()
          .setLabel("Оценка")
          .setStringSelectMenuComponent(
            new StringSelectMenuBuilder()
              .setCustomId(ScheduleFields.Value)
              .setRequired(true)
              .addOptions(
                Array.from({ length: MAX_GRADE - MIN_GRADE + 1 }, (_, index) => MAX_GRADE - index).map((value) =>
                  new StringSelectMenuOptionBuilder().setLabel(String(value)).setValue(String(value)),
                ),
              ),
          ),
      );
  }
}
