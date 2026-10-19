import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
} from "discord.js";

import type {
  StaffApplication,
  StaffApplicationStatus,
  StaffApplicationVote,
} from "../../../database/generated/prisma/client.js";

import type { ApplicationAnswer, ApplicationRole } from "../types/application.js";
import { ApplicationAction, ApplicationCustomIds } from "./applicationCustomIds.js";
import { TemplateParser } from "./templateParser.js";

const ARROW = "<:383438arrowright:1518587353390907473>";
const HEADER = "<:MemberIcon:1518579287001665587>";
const SUCCESS = "<:312537mark:1518581040548024430>";
const ERROR = "<:240191mark:1518581039172292688>";

const STATUS_COLORS: Record<StaffApplicationStatus, number> = {
  DRAFT: 0x475b56,
  AWAITING_POST: 0x475b56,
  PENDING: 0xc9a227,
  ACCEPTED: 0x2e8b57,
  REJECTED: 0xc0392b,
};

const RATINGS = ["Слабо", "Ниже среднего", "Средне", "Хорошо", "Отлично"];

const CARD_ANSWERS_BUDGET = 2200;
const THREAD_CHUNK = 3800;

export class ApplicationContainer {
  public static panel(roles: ApplicationRole[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${HEADER} | Набор в команду проекта`,
          "",
          `> ${ARROW} Выберите в меню ниже должность, на которую хотите подать заявку.`,
          `> ${ARROW} Откроется анкета с пунктами из шаблона. Если пунктов много, она разбита на несколько частей.`,
          `> ${ARROW} Кандидатам в кураторы после анкеты бот пришлёт в личные сообщения задание на пробный пост.`,
          `> ${ARROW} Решение придёт вам в личные сообщения, поэтому не закрывайте их.`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        roles.length
          ? [
              "### Открытые должности",
              roles.map((role) => `${this.emoji(role)} **${role.name}**`).join("\n"),
            ].join("\n")
          : "-# Сейчас набор закрыт.",
      ),
    );

    if (roles.length) {
      const select = new StringSelectMenuBuilder()
        .setCustomId(ApplicationCustomIds.build(ApplicationAction.Open))
        .setPlaceholder("Выберите должность")
        .addOptions(
          roles.slice(0, 25).map((role) => {
            const option = new StringSelectMenuOptionBuilder()
              .setLabel(role.name)
              .setValue(role.tagId);

            if (role.emoji) {
              option.setEmoji("unicode" in role.emoji ? { name: role.emoji.unicode } : role.emoji);
            }

            return option;
          }),
        );

      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
      );
    }

    return container;
  }

  public static partSaved(applicationId: string, nextPart: number, totalParts: number) {
    return new ContainerBuilder()
      .setAccentColor(0x475b56)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            `${SUCCESS} Часть ${nextPart} из ${totalParts} сохранена.`,
            `-# Нажмите кнопку ниже, чтобы продолжить заполнение анкеты.`,
          ].join("\n"),
        ),
      )
      .addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(ApplicationCustomIds.build(ApplicationAction.Next, applicationId, nextPart))
            .setStyle(ButtonStyle.Primary)
            .setLabel(`Продолжить: часть ${nextPart + 1}`),
        ),
      );
  }

  public static trialRequest(application: StaffApplication) {
    return new ContainerBuilder()
      .setAccentColor(0x475b56)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            `## ${HEADER} Пробный пост на куратора`,
            "Анкета получена. Остался последний шаг: напишите пробный пост от лица куратора по ситуации ниже.",
            "",
            "### Ситуация",
            this.quote(application.trialPrompt ?? ""),
            "",
            `${ARROW} Опишите обстановку, неигровых персонажей и атмосферу, дайте игрокам зацепки для действий.`,
            `${ARROW} Не пишите действия за игроков. Объём — от 300 символов.`,
            `${ARROW} Отправьте пост обычным сообщением сюда или нажмите кнопку ниже.`,
            "-# Без пробного поста заявка не попадёт на рассмотрение.",
          ].join("\n"),
        ),
      )
      .addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(ApplicationCustomIds.build(ApplicationAction.Post, application.id))
            .setStyle(ButtonStyle.Primary)
            .setLabel("Написать пробный пост"),
        ),
      );
  }

  public static review(application: StaffApplication, votes: StaffApplicationVote[]) {
    const container = new ContainerBuilder().setAccentColor(STATUS_COLORS[application.status]);

    const answers = application.answers as ApplicationAnswer[];
    const filled = answers.filter((answer) => answer.answer);
    const perAnswer = Math.max(120, Math.floor(CARD_ANSWERS_BUDGET / Math.max(filled.length, 1)));
    const createdAt = Math.floor(application.createdAt.getTime() / 1000);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${HEADER} Заявка: ${application.roleName}`,
          `${ARROW} **Кандидат:** <@${application.userId}> (\`${application.userId}\`)`,
          `${ARROW} **Подана:** <t:${createdAt}:f>`,
          application.threadId ? `-# Полный текст ответов — в ветке <#${application.threadId}>.` : null,
        ]
          .filter((line) => line !== null)
          .join("\n"),
      ),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        filled
          .map((answer) => `**${answer.title}**\n> ${TemplateParser.shorten(this.flatten(answer.answer!), perAnswer)}`)
          .join("\n") || "-# Ответов нет.",
      ),
    );

    if (application.trialPost) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Пробный пост**\n> ${TemplateParser.shorten(this.flatten(application.trialPost), 350)}`,
        ),
      );
    }

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent([this.rating(votes), this.status(application)].join("\n")),
    );

    if (application.status === "PENDING") {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(ApplicationCustomIds.build(ApplicationAction.Rate, application.id))
            .setPlaceholder("Оценить заявку")
            .addOptions(
              RATINGS.map((label, index) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(`${this.stars(index + 1)} ${label}`)
                  .setValue(String(index + 1)),
              ),
            ),
        ),
      );

      container.addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(ApplicationCustomIds.build(ApplicationAction.Accept, application.id))
            .setStyle(ButtonStyle.Success)
            .setLabel("Принять"),
          new ButtonBuilder()
            .setCustomId(ApplicationCustomIds.build(ApplicationAction.Reject, application.id))
            .setStyle(ButtonStyle.Danger)
            .setLabel("Отклонить"),
        ),
      );
    }

    return container;
  }

  public static threadChunks(application: StaffApplication) {
    const blocks = (application.answers as ApplicationAnswer[])
      .filter((answer) => answer.answer)
      .map((answer) => `### ${answer.title}\n${this.quote(answer.answer!)}`);

    if (application.trialPost) {
      const header = [
        "## Пробный пост",
        `**Ситуация:** ${application.trialPrompt ?? "—"}`,
        "",
      ].join("\n");

      const pieces = this.slice(application.trialPost, THREAD_CHUNK - header.length - 50);

      pieces.forEach((piece, index) => blocks.push(index === 0 ? `${header}${piece}` : piece));
    }

    const chunks: string[] = [];

    for (const block of blocks) {
      const last = chunks.at(-1);

      if (last && last.length + block.length + 2 <= THREAD_CHUNK) {
        chunks[chunks.length - 1] = `${last}\n\n${block}`;
      } else {
        chunks.push(block);
      }
    }

    return chunks.map((chunk) =>
      new ContainerBuilder()
        .setAccentColor(0x475b56)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(chunk)),
    );
  }

  public static decisionNotice(application: StaffApplication) {
    const accepted = application.status === "ACCEPTED";

    return new ContainerBuilder()
      .setAccentColor(STATUS_COLORS[application.status])
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            `## ${HEADER} Заявка на должность «${application.roleName}»`,
            accepted
              ? `${SUCCESS} Поздравляем, ваша заявка принята! Добро пожаловать в команду.`
              : `${ERROR} К сожалению, ваша заявка отклонена.`,
            !accepted && application.rejectReason ? `\n**Причина:**\n${this.quote(application.rejectReason)}` : null,
            accepted
              ? "-# Роль выдана автоматически. Если чего-то не хватает, напишите администрации."
              : "-# Вы можете подать заявку повторно позже.",
          ]
            .filter((line) => line !== null)
            .join("\n"),
        ),
      );
  }

  public static success(text: string) {
    return new ContainerBuilder()
      .setAccentColor(0x2e8b57)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${SUCCESS} ${text}`));
  }

  public static error(text: string) {
    return new ContainerBuilder()
      .setAccentColor(0xc0392b)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${ERROR} ${text}`));
  }

  public static stars(value: number) {
    const rounded = Math.min(5, Math.max(0, Math.round(value)));

    return "★".repeat(rounded) + "☆".repeat(5 - rounded);
  }

  private static rating(votes: StaffApplicationVote[]) {
    if (!votes.length) {
      return "**Оценка:** ☆☆☆☆☆ пока никто не оценил";
    }

    const average = votes.reduce((sum, vote) => sum + vote.stars, 0) / votes.length;

    const voters = votes
      .slice(0, 15)
      .map((vote) => `<@${vote.userId}> ${this.stars(vote.stars)}`)
      .join(" · ");

    return [
      `**Оценка:** ${this.stars(average)} **${average.toFixed(1)}** из 5 · ${votes.length} ${this.plural(votes.length)}`,
      `-# ${voters}${votes.length > 15 ? " · …" : ""}`,
    ].join("\n");
  }

  private static status(application: StaffApplication) {
    const decidedAt = application.decidedAt
      ? ` · <t:${Math.floor(application.decidedAt.getTime() / 1000)}:R>`
      : "";

    switch (application.status) {
      case "ACCEPTED":
        return `**Статус:** 🟢 Принята · <@${application.decidedById}>${decidedAt}`;
      case "REJECTED":
        return [
          `**Статус:** 🔴 Отклонена · <@${application.decidedById}>${decidedAt}`,
          application.rejectReason ? `-# Причина: ${TemplateParser.shorten(this.flatten(application.rejectReason), 300)}` : null,
        ]
          .filter((line) => line !== null)
          .join("\n");
      default:
        return "**Статус:** 🟡 На рассмотрении\n-# Оценивать может команда проекта, решение принимает администрация.";
    }
  }

  private static plural(count: number) {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (mod10 === 1 && mod100 !== 11) {
      return "оценка";
    }

    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return "оценки";
    }

    return "оценок";
  }

  private static emoji(role: ApplicationRole) {
    if (!role.emoji) {
      return ARROW;
    }

    return "unicode" in role.emoji ? role.emoji.unicode : `<:${role.emoji.name}:${role.emoji.id}>`;
  }

  private static flatten(text: string) {
    return text.replace(/\s+/g, " ").trim();
  }

  private static quote(text: string) {
    return text
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  }

  private static slice(text: string, size: number) {
    const pieces: string[] = [];

    for (let index = 0; index < text.length; index += size) {
      pieces.push(text.slice(index, index + size));
    }

    return pieces;
  }
}
