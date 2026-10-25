import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  ContainerBuilder,
  LabelBuilder,
  ModalBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import {
  LessonStatus,
  type ScheduleSettings,
  type Subject,
} from "../../../database/generated/prisma/client.js";

import { ManageComponents } from "../../manage/lib/manageComponents.js";
import type { LessonDetails, LessonWithSubject } from "../types/schedule.js";
import { ARROW, BACK, PAD, SCHEDULE_HEADER, SUCCESS, subjectTitle, text } from "./lessonCard.js";
import { lessonLine, lessonOption, ScheduleContainer } from "./scheduleContainer.js";
import { ScheduleAdminAction, ScheduleCustomIds, ScheduleFields } from "./scheduleCustomIds.js";

const SETTINGS = "<:479873settingsna:1518581042456432791>";
const ADD = "<:6509addguild:1518587247769817088>";
const EDIT = "<:12784editor:1518587261707616407>";

const button = (action: ScheduleAdminAction, label: string, emoji: string, style = ButtonStyle.Secondary, ...args: string[]) =>
  new ButtonBuilder()
    .setCustomId(ScheduleCustomIds.admin(action, ...args))
    .setLabel(label)
    .setEmoji(emoji)
    .setStyle(style);

export class ScheduleAdminContainer {
  public static root(
    pending: LessonWithSubject[],
    upcoming: LessonWithSubject[],
    settings: ScheduleSettings | null,
    subjects: number,
    notice: string | null = null,
  ) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    text(container, [
      `# ${SCHEDULE_HEADER} Расписание`,
      `-# Предметов: ${subjects} · заявки: ${settings?.reviewChannelId ? `<#${settings.reviewChannelId}>` : "только здесь"} · напоминание за ${settings?.reminderMinutes ?? 15} мин.`,
      notice ? `${SUCCESS} ${notice}` : null,
      "",
      "### Ждут утверждения",
      pending.length ? pending.map(lessonLine).join("\n") : "-# Новых заявок нет.",
      "",
      "### Ближайшие занятия",
      upcoming.length ? upcoming.map(lessonLine).join("\n") : "-# Утверждённых занятий впереди нет.",
      "-# Преподаватели — это роли, которым открыт /schedule в разделе «Доступ».",
      `-# ${PAD}`,
    ]);

    const lessons = [...pending, ...upcoming];

    if (lessons.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(ScheduleCustomIds.admin(ScheduleAdminAction.Open))
            .setPlaceholder("Открыть занятие")
            .addOptions(lessons.slice(0, 25).map(lessonOption)),
        ),
      );
    }

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        button(ScheduleAdminAction.Subjects, "Предметы", "<:6849serverguide:1518587250802426078>"),
        button(ScheduleAdminAction.Settings, "Настройки", SETTINGS),
        ManageComponents.homeButton(),
      ),
    );

    return container;
  }

  public static lesson(lesson: LessonDetails, notice: string | null = null) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);
    const started = lesson.startsAt.getTime() <= Date.now();

    ScheduleContainer.details(container, lesson, notice);

    const row = new ActionRowBuilder<ButtonBuilder>();

    if (lesson.status === LessonStatus.PENDING) {
      row.addComponents(
        button(ScheduleAdminAction.Approve, "Утвердить", "<:checkmark_teal:1562262873902817401>", ButtonStyle.Success, lesson.id),
        button(ScheduleAdminAction.Reject, "Отклонить", "<:12138cross:1518587259669053591>", ButtonStyle.Danger, lesson.id),
      );
    }

    if (lesson.status === LessonStatus.PENDING || (lesson.status === LessonStatus.APPROVED && !started)) {
      row.addComponents(button(ScheduleAdminAction.Cancel, "Отменить", "<:14605delete:1518587266505642074>", ButtonStyle.Secondary, lesson.id));
    }

    row.addComponents(button(ScheduleAdminAction.Root, "К расписанию", BACK));

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
    container.addActionRowComponents(row);

    return container;
  }

  public static subjects(subjects: Subject[], notice: string | null = null) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    text(container, [
      `# ${SCHEDULE_HEADER} Предметы`,
      notice ? `${SUCCESS} ${notice}` : null,
      "",
      subjects.length
        ? subjects
            .map((subject) => `${subject.active ? ARROW : "<:dot_white:1562262867846373436>"} ${subjectTitle(subject)}${subject.active ? "" : " · скрыт"}`)
            .join("\n")
        : `${ARROW} Предметов пока нет. Добавьте первый — без них преподаватели не смогут создавать занятия.`,
      "-# Скрытые предметы нельзя выбрать для новых занятий, но оценки по ним остаются в табелях.",
      `-# ${PAD}`,
    ]);

    if (subjects.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(ScheduleCustomIds.admin(ScheduleAdminAction.SubjectOpen))
            .setPlaceholder("Открыть предмет")
            .addOptions(
              subjects.slice(0, 25).map((subject) => {
                const option = new StringSelectMenuOptionBuilder()
                  .setLabel(subject.name.slice(0, 100))
                  .setDescription(subject.active ? `Порядок ${subject.sortOrder}` : "Скрыт")
                  .setValue(subject.id);

                return subject.emoji ? option.setEmoji(subject.emoji) : option;
              }),
            ),
        ),
      );
    }

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        button(ScheduleAdminAction.SubjectCreate, "Добавить предмет", ADD, ButtonStyle.Primary),
        button(ScheduleAdminAction.Root, "К расписанию", BACK),
      ),
    );

    return container;
  }

  public static subject(subject: Subject, notice: string | null = null) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    text(container, [
      `# ${subjectTitle(subject)}`,
      `-# ${subject.active ? "Доступен для новых занятий" : "Скрыт"} · порядок ${subject.sortOrder}`,
      notice ? `${SUCCESS} ${notice}` : null,
      `-# ${PAD}`,
    ]);

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        button(ScheduleAdminAction.SubjectEdit, "Изменить", EDIT, ButtonStyle.Primary, subject.id),
        button(
          ScheduleAdminAction.SubjectToggle,
          subject.active ? "Скрыть" : "Вернуть",
          subject.active ? "<:dot_white:1562262867846373436>" : "<:dot_green:1562262861374423044>",
          ButtonStyle.Secondary,
          subject.id,
        ),
        button(ScheduleAdminAction.Subjects, "К предметам", BACK),
      ),
    );

    return container;
  }

  public static subjectModal(subject: Subject | null) {
    const field = (id: string, required: boolean, max: number, placeholder: string, value?: string | null) => {
      const input = new TextInputBuilder().setCustomId(id).setStyle(TextInputStyle.Short).setRequired(required).setMaxLength(max).setPlaceholder(placeholder);

      return value ? input.setValue(value) : input;
    };

    return new ModalBuilder()
      .setCustomId(ScheduleCustomIds.admin(ScheduleAdminAction.SubjectModal, subject?.id ?? "new"))
      .setTitle(subject ? "Изменить предмет" : "Новый предмет")
      .addLabelComponents(
        new LabelBuilder().setLabel("Название").setTextInputComponent(field(ScheduleFields.Name, true, 60, "Чары", subject?.name)),
        new LabelBuilder()
          .setLabel("Эмодзи")
          .setDescription("Необязательно. Обычный или кастомный <:name:id>")
          .setTextInputComponent(field(ScheduleFields.Emoji, false, 80, "🪄", subject?.emoji)),
        new LabelBuilder()
          .setLabel("Порядок в списках")
          .setTextInputComponent(field(ScheduleFields.Order, false, 5, "0", subject ? String(subject.sortOrder) : null)),
      );
  }

  public static settingsModal(settings: ScheduleSettings | null) {
    const channel = new ChannelSelectMenuBuilder()
      .setCustomId(ScheduleFields.ReviewChannel)
      .setChannelTypes(ChannelType.GuildText)
      .setPlaceholder("Канал для заявок на занятия")
      .setRequired(false);

    if (settings?.reviewChannelId) {
      channel.setDefaultChannels(settings.reviewChannelId);
    }

    return new ModalBuilder()
      .setCustomId(ScheduleCustomIds.admin(ScheduleAdminAction.SettingsModal))
      .setTitle("Настройки расписания")
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Канал заявок")
          .setDescription("Сюда бот присылает новые занятия с кнопками утверждения. Пусто — только в /manage")
          .setChannelSelectMenuComponent(channel),
        new LabelBuilder()
          .setLabel("Напоминание, минут до начала")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(ScheduleFields.ReminderMinutes)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(3)
              .setValue(String(settings?.reminderMinutes ?? 15)),
          ),
      );
  }
}
