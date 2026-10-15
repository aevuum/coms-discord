import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import type { Award } from "../../../database/generated/prisma/client.js";

import { ManageComponents } from "../../manage/lib/manageComponents.js";
import { AwardAction, AwardCustomIds, AwardModalFields } from "./awardCustomIds.js";
import { AwardFormatter, RARITY_ORDER } from "./awardFormatter.js";

const MAX_SELECT_OPTIONS = 25;

export class AwardComponents {
  public static rootActions(hasAwards: boolean) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(AwardCustomIds.build(AwardAction.Create))
        .setLabel("Создать")
        .setEmoji("<:6509addguild:1518587247769817088>")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(AwardCustomIds.build(AwardAction.Give))
        .setLabel("Выдать")
        .setEmoji("<:766839verifiedgreen:1518587368636944534>")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!hasAwards),

      new ButtonBuilder()
        .setCustomId(AwardCustomIds.build(AwardAction.Take))
        .setLabel("Снять")
        .setEmoji("<:12138cross:1518587259669053591>")
        .setStyle(ButtonStyle.Secondary),

      new ButtonBuilder()
        .setCustomId(AwardCustomIds.build(AwardAction.Delete))
        .setLabel("Удалить")
        .setEmoji("<:14605delete:1518587266505642074>")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!hasAwards),
    );
  }

  public static awardSelect(customId: string, awards: Award[], placeholder: string) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(placeholder)
        .addOptions(
          awards.slice(0, MAX_SELECT_OPTIONS).map((award) => {
            const option = new StringSelectMenuOptionBuilder()
              .setLabel(award.label.slice(0, 100))
              .setDescription(
                `${AwardFormatter.rarityLabel(award.rarity)} · ${award.rewardComsCoins} COMS`,
              )
              .setValue(award.id);

            const emoji = AwardFormatter.parseEmoji(award.emoji);

            if (emoji && !("id" in emoji)) {
              option.setEmoji(emoji);
            }

            return option;
          }),
        ),
    );
  }

  public static backRow() {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      this.backButton(),
      ManageComponents.homeButton(),
    );
  }

  public static deleteConfirm(award: Award) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(AwardCustomIds.build(AwardAction.DeleteConfirm, award.id))
        .setLabel("Удалить навсегда")
        .setEmoji("<:14605delete:1518587266505642074>")
        .setStyle(ButtonStyle.Danger),

      this.backButton("Отмена"),
    );
  }

  public static createModal() {
    const rarity = new StringSelectMenuBuilder()
      .setCustomId(AwardModalFields.Rarity)
      .setPlaceholder("Выберите редкость")
      .setRequired(true)
      .addOptions(
        RARITY_ORDER.map((level) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(AwardFormatter.rarityLabel(level))
            .setValue(level)
            .setEmoji(AwardFormatter.rarityEmoji(level)),
        ),
      );

    return new ModalBuilder()
      .setCustomId(AwardCustomIds.build(AwardAction.CreateModal))
      .setTitle("Новая награда")
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Название")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(AwardModalFields.Label)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(80),
          ),
        new LabelBuilder()
          .setLabel("Эмодзи")
          .setDescription("Обычный эмодзи или <:name:id>")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(AwardModalFields.Emoji)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(80)
              .setPlaceholder("🏆"),
          ),
        new LabelBuilder()
          .setLabel("Награда в COMS")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(AwardModalFields.Coins)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(7)
              .setPlaceholder("100"),
          ),
        new LabelBuilder()
          .setLabel("Описание")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(AwardModalFields.Description)
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMaxLength(300),
          ),
        new LabelBuilder()
          .setLabel("Редкость")
          .setStringSelectMenuComponent(rarity),
      );
  }

  private static backButton(label = "Назад") {
    return new ButtonBuilder()
      .setCustomId(AwardCustomIds.build(AwardAction.Root))
      .setLabel(label)
      .setEmoji("<:26204blackarrow:1518587278467792997>")
      .setStyle(ButtonStyle.Secondary);
  }
}
