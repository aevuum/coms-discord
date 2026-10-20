import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  LabelBuilder,
  ModalBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import type {
  Suggestion,
  SuggestionRating,
  SuggestionReaction,
  SuggestionStatus,
} from "../../../database/generated/prisma/client.js";

import {
  SUGGESTION_CATEGORIES,
  SuggestionAction,
  SuggestionCustomIds,
  SuggestionFields,
  suggestionCategory,
} from "./suggestionConfig.js";

const ARROW = "<:383438arrowright:1518587353390907473>";
const SUCCESS = "<:312537mark:1518581040548024430>";
const ERROR = "<:240191mark:1518581039172292688>";

const COLORS: Record<SuggestionStatus, number> = {
  PENDING: 0x475b56,
  ACCEPTED: 0x2e8b57,
  REJECTED: 0xc0392b,
};

const RATINGS = ["Слабо", "Ниже среднего", "Средне", "Хорошо", "Отлично"];

export type SuggestionWithVotes = Suggestion & {
  reactions: SuggestionReaction[];
  ratings: SuggestionRating[];
};

export class SuggestionContainer {
  public static panel() {
    return new ContainerBuilder()
      .setAccentColor(0x475b56)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            "# 💡 | Идеи для сервера",
            "",
            `> ${ARROW} Есть идея новой механики, предложение изменить существующую или улучшить сервер? Нажмите кнопку ниже и опишите её.`,
            `> ${ARROW} Идея попадёт в канал идей: игроки смогут поддержать её или выступить против, а команда проекта — оценить.`,
            `> ${ARROW} Итоговое решение принимает администрация, ответ придёт вам в личные сообщения.`,
          ].join("\n"),
        ),
      )
      .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "-# Одна идея — одно предложение. Опишите, что именно изменить и зачем: так идею проще оценить.",
        ),
      )
      .addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(SuggestionCustomIds.build(SuggestionAction.Open))
            .setLabel("Предложить идею")
            .setEmoji("💡")
            .setStyle(ButtonStyle.Success),
        ),
      );
  }

  public static modal() {
    return new ModalBuilder()
      .setCustomId(SuggestionCustomIds.build(SuggestionAction.Submit))
      .setTitle("Новая идея")
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Кратко: в чём идея")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(SuggestionFields.Title)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMinLength(5)
              .setMaxLength(100)
              .setPlaceholder("Например: еженедельные дуэли между факультетами"),
          ),
        new LabelBuilder().setLabel("Категория").setStringSelectMenuComponent(
          new StringSelectMenuBuilder()
            .setCustomId(SuggestionFields.Category)
            .setRequired(true)
            .addOptions(
              SUGGESTION_CATEGORIES.map((category) =>
                new StringSelectMenuOptionBuilder()
                  .setValue(category.value)
                  .setLabel(category.label)
                  .setEmoji(category.emoji),
              ),
            ),
        ),
        new LabelBuilder()
          .setLabel("Подробное описание")
          .setDescription("Как это должно работать, что изменить")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(SuggestionFields.Description)
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMinLength(20)
              .setMaxLength(1200),
          ),
        new LabelBuilder()
          .setLabel("Зачем это серверу")
          .setDescription("Какую проблему решает или что улучшит — необязательно")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(SuggestionFields.Benefit)
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(false)
              .setMaxLength(500),
          ),
      );
  }

  public static rejectModal(id: string) {
    return new ModalBuilder()
      .setCustomId(SuggestionCustomIds.build(SuggestionAction.RejectModal, id))
      .setTitle("Отклонить идею")
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Причина")
          .setDescription("Автор и игроки увидят её в карточке идеи")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(SuggestionFields.Reason)
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(false)
              .setMaxLength(500),
          ),
      );
  }

  public static card(suggestion: SuggestionWithVotes) {
    const container = new ContainerBuilder().setAccentColor(COLORS[suggestion.status]);
    const category = suggestionCategory(suggestion.category);
    const createdAt = Math.floor(suggestion.createdAt.getTime() / 1000);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          suggestion.pingRoleId ? `<@&${suggestion.pingRoleId}>` : null,
          `-# ${category.emoji} ${category.label} · идея #${suggestion.number}`,
          `# ${suggestion.title}`,
          `-# Автор: <@${suggestion.authorId}> · <t:${createdAt}:R>`,
          "",
          this.quote(suggestion.description),
          suggestion.benefit ? `\n**Зачем это серверу**\n${this.quote(suggestion.benefit)}` : null,
        ]
          .filter((line) => line !== null)
          .join("\n"),
      ),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent([this.staffBlock(suggestion.ratings), "", this.playersBlock(suggestion.reactions)].join("\n")),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(this.status(suggestion)));

    const pending = suggestion.status === "PENDING";
    const up = suggestion.reactions.filter((reaction) => reaction.value > 0).length;
    const down = suggestion.reactions.filter((reaction) => reaction.value < 0).length;

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(SuggestionCustomIds.build(SuggestionAction.Up, suggestion.id))
          .setLabel(String(up))
          .setEmoji("👍")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(!pending),
        new ButtonBuilder()
          .setCustomId(SuggestionCustomIds.build(SuggestionAction.Down, suggestion.id))
          .setLabel(String(down))
          .setEmoji("👎")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(!pending),
      ),
    );

    if (pending) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(SuggestionCustomIds.build(SuggestionAction.Rate, suggestion.id))
            .setPlaceholder("Оценка команды проекта")
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
            .setCustomId(SuggestionCustomIds.build(SuggestionAction.Accept, suggestion.id))
            .setLabel("Принять")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(SuggestionCustomIds.build(SuggestionAction.Reject, suggestion.id))
            .setLabel("Отклонить")
            .setStyle(ButtonStyle.Danger),
        ),
      );
    }

    return container;
  }

  public static decisionNotice(suggestion: Suggestion, messageUrl: string | null) {
    const accepted = suggestion.status === "ACCEPTED";

    return new ContainerBuilder()
      .setAccentColor(COLORS[suggestion.status])
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            `## 💡 Ваша идея #${suggestion.number} рассмотрена`,
            `**${suggestion.title}**`,
            accepted
              ? `${SUCCESS} Администрация приняла идею. Спасибо, что помогаете делать сервер лучше!`
              : `${ERROR} Администрация отклонила идею.`,
            !accepted && suggestion.reason ? `\n**Причина:**\n${this.quote(suggestion.reason)}` : null,
            messageUrl ? `\n${ARROW} [Открыть идею](${messageUrl})` : null,
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

  private static staffBlock(ratings: SuggestionRating[]) {
    if (!ratings.length) {
      return "### 🛡️ Оценка команды\n-# Команда проекта ещё не оценила идею.";
    }

    const average = ratings.reduce((sum, rating) => sum + rating.stars, 0) / ratings.length;

    return [
      `### 🛡️ Оценка команды: ${this.stars(average)} ${average.toFixed(1)} из 5`,
      ...ratings.slice(0, 10).map((rating) => `${ARROW} <@${rating.userId}> — ${this.stars(rating.stars)}`),
      ratings.length > 10 ? `-# и ещё ${ratings.length - 10}` : null,
    ]
      .filter((line) => line !== null)
      .join("\n");
  }

  private static playersBlock(reactions: SuggestionReaction[]) {
    const up = reactions.filter((reaction) => reaction.value > 0).length;
    const down = reactions.length - up;

    if (!reactions.length) {
      return "### 👥 Игроки\n-# Пока никто не проголосовал.";
    }

    const percent = Math.round((up / reactions.length) * 100);
    const filled = Math.round(percent / 10);

    return [
      `### 👥 Игроки: ${percent}% за`,
      `${"🟩".repeat(filled)}${"🟥".repeat(10 - filled)}`,
      `-# 👍 ${up} · 👎 ${down}`,
    ].join("\n");
  }

  private static status(suggestion: Suggestion) {
    const decidedAt = suggestion.decidedAt
      ? ` · <t:${Math.floor(suggestion.decidedAt.getTime() / 1000)}:R>`
      : "";

    switch (suggestion.status) {
      case "ACCEPTED":
        return `**Статус:** 🟢 Принята администрацией · <@${suggestion.decidedById}>${decidedAt}`;
      case "REJECTED":
        return [
          `**Статус:** 🔴 Отклонена · <@${suggestion.decidedById}>${decidedAt}`,
          suggestion.reason ? `-# Причина: ${suggestion.reason.replace(/\s+/g, " ")}` : null,
        ]
          .filter((line) => line !== null)
          .join("\n");
      default:
        return "**Статус:** 🟡 На рассмотрении\n-# 👍/👎 — голос игроков, звёзды — оценка команды, решение принимает администрация.";
    }
  }

  private static quote(text: string) {
    return text
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  }
}
