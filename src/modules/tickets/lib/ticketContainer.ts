import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
} from "discord.js";

import type { Ticket } from "../../../database/generated/prisma/client.js";

import type { TicketSubject } from "../types/ticket.js";
import { TICKET_PANEL_IMAGE_NAME, TICKET_REVIEWER_ROLE_ID } from "./ticketConfig.js";
import { TicketAction, TicketCustomIds } from "./ticketCustomIds.js";

const ARROW = "<:383438arrowright:1518587353390907473>";
const HEADER = "<:172841lastmeadowbadge:1518587343378976779>";
const TICKET = "<:12784editor:1518587261707616407>";
const CALL = "<:21796announcement:1518587271303925830>";
const SUCCESS = "<:312537mark:1518581040548024430>";
const ERROR = "<:240191mark:1518581039172292688>";

export class TicketContainer {
  public static panel(subjects: TicketSubject[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder().setURL(`attachment://${TICKET_PANEL_IMAGE_NAME}`),
      ),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${HEADER} | Регистрация в ролевой`,
          "",
          `> ${ARROW} Выберите в меню ниже, что вы хотите зарегистрировать. Бот создаст для вас приватный канал-тикет.`,
          `> ${ARROW} В тикете будет ссылка на шаблон анкеты — заполните его и отправьте в тикет.`,
          `> ${ARROW} Когда анкета готова, нажмите «Вызвать анкетолога».`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        subjects.length
          ? [
              "### Что можно зарегистрировать",
              subjects
                .map((subject) => `${this.emoji(subject)} **${subject.name}**`)
                .join("\n"),
            ].join("\n")
          : "-# Сейчас регистрация недоступна.",
      ),
    );

    const select = new StringSelectMenuBuilder()
      .setCustomId(TicketCustomIds.build(TicketAction.Open))
      .setPlaceholder("Выберите, что зарегистрировать");

    if (subjects.length) {
      select.addOptions(
        subjects.slice(0, 25).map((subject) => {
          const option = new StringSelectMenuOptionBuilder()
            .setValue(subject.tagId)
            .setLabel(subject.name)
            .setDescription(`Открыть тикет: ${subject.name.toLowerCase()}`);

          if (subject.emoji) {
            option.setEmoji(
              "unicode" in subject.emoji
                ? { name: subject.emoji.unicode }
                : { id: subject.emoji.id, name: subject.emoji.name },
            );
          }

          return option;
        }),
      );
    } else {
      select
        .setDisabled(true)
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setValue("none")
            .setLabel("Нет доступных вариантов"),
        );
    }

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
    );

    return container;
  }

  public static ticket(ticket: Ticket, ownerName: string, templateUrl: string | null) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${TICKET} Регистрация: ${ticket.subject}`,
          "",
          `${ARROW} Игрок: <@${ticket.ownerId}> (**${ownerName}**)`,
          templateUrl
            ? `${ARROW} Шаблон анкеты: ${templateUrl}`
            : `${ARROW} Шаблон анкеты ищите в форуме с шаблонами.`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "Заполните шаблон и отправьте анкету в этот канал. Когда всё готово — нажмите «Вызвать анкетолога».",
          "-# Анкетолога можно вызывать не чаще одного раза в 10 минут. После закрытия тикета канал будет удалён.",
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(TicketCustomIds.build(TicketAction.Call))
          .setLabel("Вызвать анкетолога")
          .setEmoji(CALL)
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(TicketCustomIds.build(TicketAction.Close))
          .setLabel("Закрыть тикет")
          .setEmoji("<:12138cross:1518587259669053591>")
          .setStyle(ButtonStyle.Danger),
      ),
    );

    return container;
  }

  public static staffCall(ticket: Ticket, ownerName: string) {
    const closed = ticket.status === "CLOSED";

    const container = new ContainerBuilder().setAccentColor(closed ? 0x4f545c : 0x475b56);

    const lines = [
      `# ${CALL} Анкета на проверку`,
      "",
      `${ARROW} Тикет: **${ticket.subject}**`,
      `${ARROW} Игрок: <@${ticket.ownerId}> (**${ownerName}**)`,
    ];

    if (closed) {
      lines.push(`${ARROW} Статус: тикет закрыт`);
    } else {
      lines.push(
        ticket.reviewerId
          ? `${ARROW} Рассматривает: <@${ticket.reviewerId}>`
          : `${ARROW} <@&${TICKET_REVIEWER_ROLE_ID}>, игрок ждёт проверки анкеты.`,
      );
    }

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")));

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(TicketCustomIds.build(TicketAction.Review, ticket.id))
          .setLabel(closed ? "Тикет закрыт" : "Рассмотреть тикет")
          .setEmoji("<:84305verifiedgreen:1518587318926049290>")
          .setStyle(ButtonStyle.Success)
          .setDisabled(closed),
      ),
    );

    return container;
  }

  public static called() {
    return this.notice(
      [
        `## ${CALL} Анкетолог вызван`,
        `${ARROW} Анкетологи получили уведомление. Когда кто-то из них возьмёт тикет, он появится в этом канале.`,
      ].join("\n"),
    );
  }

  public static reviewerJoined(reviewerId: string) {
    return this.notice(
      [
        `## ${SUCCESS} Анкетолог на месте`,
        `${ARROW} <@${reviewerId}> присоединился к тикету и проверит анкету.`,
      ].join("\n"),
    );
  }

  public static reviewAccess(url: string) {
    const container = this.notice(
      [
        `## ${SUCCESS} Тикет ваш`,
        `${ARROW} Доступ к тикету выдан, переходите по кнопке ниже.`,
      ].join("\n"),
    );

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setURL(url).setLabel("Перейти к тикету").setStyle(ButtonStyle.Link),
      ),
    );

    return container;
  }

  public static created(subject: string, url: string) {
    const container = this.notice(
      [
        `## ${SUCCESS} Тикет создан`,
        `${ARROW} Тикет «${subject}» создан, перейдите в него по кнопке ниже.`,
      ].join("\n"),
    );

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setURL(url).setLabel("Перейти к тикету").setStyle(ButtonStyle.Link),
      ),
    );

    return container;
  }

  public static closeConfirm() {
    const container = this.notice(
      [
        `## ${TICKET} Закрыть тикет?`,
        `${ARROW} Канал тикета будет удалён без возможности восстановления.`,
      ].join("\n"),
    );

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(TicketCustomIds.build(TicketAction.CloseConfirm))
          .setLabel("Закрыть")
          .setEmoji("<:14605delete:1518587266505642074>")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(TicketCustomIds.build(TicketAction.CloseCancel))
          .setLabel("Отмена")
          .setEmoji("<:12138cross:1518587259669053591>")
          .setStyle(ButtonStyle.Secondary),
      ),
    );

    return container;
  }

  public static closing(closedById: string, seconds: number) {
    return this.notice(
      [
        `## ${TICKET} Тикет закрыт`,
        `${ARROW} Закрыл: <@${closedById}>`,
        `-# Канал будет удалён через ${seconds} секунд.`,
      ].join("\n"),
    );
  }

  public static closedDm(subject: string) {
    return this.notice(
      [`## ${TICKET} Тикет закрыт`, `${ARROW} Ваш тикет «${subject}» закрыт.`].join(
        "\n",
      ),
    );
  }

  public static success(title: string, message: string) {
    return this.notice([`## ${SUCCESS} ${title}`, `${ARROW} ${message}`].join("\n"));
  }

  public static error(message: string) {
    return this.notice([`## ${ERROR} Ошибка`, `${ARROW} ${message}`].join("\n"));
  }

  public static emoji(subject: TicketSubject) {
    if (!subject.emoji) {
      return ARROW;
    }

    return "unicode" in subject.emoji
      ? subject.emoji.unicode
      : `<:${subject.emoji.name}:${subject.emoji.id}>`;
  }

  private static notice(content: string) {
    return new ContainerBuilder()
      .setAccentColor(0x475b56)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  }
}
