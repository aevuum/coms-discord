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
  UserSelectMenuBuilder,
} from "discord.js";

import type { CharacterOption } from "../types/economy.js";
import { EconomyCustomIds, TransferModalFields } from "./economyCustomIds.js";

const MAX_SELECT_OPTIONS = 25;

export class EconomyComponents {
  public static characterSelect(characters: CharacterOption[]) {
    return this.buildCharacterSelect(
      EconomyCustomIds.characterSelect(),
      "Выберите персонажа",
      characters,
    );
  }

  public static transferCharacterSelect(
    senderId: string,
    characters: CharacterOption[],
  ) {
    return this.buildCharacterSelect(
      EconomyCustomIds.transferCharacter(senderId),
      "Выберите персонажа получателя",
      characters,
    );
  }

  public static transferUserSelect(senderId: string) {
    return new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(EconomyCustomIds.transferUser(senderId))
        .setPlaceholder("Выберите игрока")
        .setMinValues(1)
        .setMaxValues(1),
    );
  }

  public static main(characterId: string, canTransfer: boolean) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(EconomyCustomIds.transfer(characterId))
        .setLabel("Передать")
        .setEmoji("<:766839verifiedgreen:1518587368636944534>")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(!canTransfer),

      new ButtonBuilder()
        .setCustomId(EconomyCustomIds.history(characterId))
        .setLabel("История")
        .setEmoji("<:988044dots:1518581053642772621>")
        .setStyle(ButtonStyle.Secondary),
    );
  }

  public static transferConfirm(
    senderId: string,
    receiverId: string,
    amountKnuts: number,
  ) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(
          EconomyCustomIds.transferConfirm(senderId, receiverId, amountKnuts),
        )
        .setLabel("Подтвердить")
        .setEmoji("<:766839verifiedgreen:1518587368636944534>")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(EconomyCustomIds.main(senderId))
        .setLabel("Отмена")
        .setEmoji("<:83987delete:1518587334218627072>")
        .setStyle(ButtonStyle.Secondary),
    );
  }

  public static historyNavigation(
    characterId: string,
    page: number,
    totalPages: number,
  ) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(EconomyCustomIds.history(characterId, page - 1))
        .setLabel("Назад")
        .setEmoji("<:26204blackarrow:1518587278467792997>")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page <= 0),

      new ButtonBuilder()
        .setCustomId(EconomyCustomIds.history(characterId, page + 1))
        .setLabel("Вперёд")
        .setEmoji("<:48765whitearrow:1518587298281685173>")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(page >= totalPages - 1),

      new ButtonBuilder()
        .setCustomId(EconomyCustomIds.main(characterId))
        .setLabel("К персонажу")
        .setEmoji("<:16874shopcyan:1518587268154134569>")
        .setStyle(ButtonStyle.Primary),
    );
  }

  public static backToSelection() {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(EconomyCustomIds.back())
        .setLabel("Назад")
        .setEmoji("<:26204blackarrow:1518587278467792997>")
        .setStyle(ButtonStyle.Secondary),
    );
  }

  public static backToCharacter(characterId: string) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(EconomyCustomIds.main(characterId))
        .setLabel("Назад")
        .setEmoji("<:26204blackarrow:1518587278467792997>")
        .setStyle(ButtonStyle.Secondary),
    );
  }

  public static transferModal(senderId: string, receiverId: string) {
    return new ModalBuilder()
      .setCustomId(EconomyCustomIds.transferModal(senderId, receiverId))
      .setTitle("Передача денег")
      .addLabelComponents(
        this.amountLabel(TransferModalFields.Galleons, "Галлеоны"),
        this.amountLabel(TransferModalFields.Sickles, "Сикли"),
        this.amountLabel(TransferModalFields.Knuts, "Кнаты"),
      );
  }

  private static amountLabel(customId: string, label: string) {
    return new LabelBuilder()
      .setLabel(label)
      .setDescription("Целое неотрицательное число")
      .setTextInputComponent(
        new TextInputBuilder()
          .setCustomId(customId)
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(10)
          .setPlaceholder("0"),
      );
  }

  private static buildCharacterSelect(
    customId: string,
    placeholder: string,
    characters: CharacterOption[],
  ) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder(placeholder)
      .addOptions(
        characters
          .slice(0, MAX_SELECT_OPTIONS)
          .map((character) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(character.rpName.slice(0, 100))
              .setValue(character.id),
          ),
      );

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  }
}
