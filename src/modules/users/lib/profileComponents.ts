import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

import type {
  Character,
  InventoryItem,
  ShopItem,
} from "../../../database/generated/prisma/client.js";

import { ShopFormatter } from "../../shop/lib/shopFormatter.js";

const MAX_SELECT_OPTIONS = 25;

export class ProfileComponents {
  public static createMenu(targetUserId: string): ActionRowBuilder<any>[] {
    const menuRow = new ActionRowBuilder<any>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`profile_menu_${targetUserId}`)
        .setPlaceholder("Выберите раздел")
        .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel("Главная")
            .setValue("main")
            .setEmoji("<:423717discordcamp:1518587355068497950>"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Экономика")
            .setValue("economy")
            .setEmoji("<:178616member:1518581036798181436>"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Награды")
            .setValue("awards")
            .setEmoji("<:972712donator:1518581051960852601>"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Персонажи")
            .setValue("characters")
            .setEmoji("<:6849serverguide:1518587250802426078>"),
          new StringSelectMenuOptionBuilder()
            .setLabel("Инвентарь")
            .setValue("inventory")
            .setEmoji("<:29865potionwhite:1518587289989550100>"),
        ),
    );

    const buttonRow = new ActionRowBuilder<any>().addComponents(
      new ButtonBuilder()
        .setCustomId(`profile_settings_${targetUserId}`)
        .setLabel("Настроить профиль")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:479873settingsna:1518581042456432791>"),
    );

    return [menuRow, buttonRow];
  }

  public static characterSelect(targetUserId: string, characters: Character[]) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`profile_character_${targetUserId}`)
        .setPlaceholder("Открыть карточку персонажа (придёт в ЛС)")
        .addOptions(
          characters.slice(0, MAX_SELECT_OPTIONS).map((character) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(character.rpName.slice(0, 100))
              .setValue(character.id)
              .setEmoji("<:928205membericon:1518581050555633674>"),
          ),
        ),
    );
  }

  public static itemSelect(
    targetUserId: string,
    inventory: (InventoryItem & { shopItem: ShopItem })[],
  ) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`profile_item_${targetUserId}`)
        .setPlaceholder("Использовать предмет")
        .addOptions(
          inventory.slice(0, MAX_SELECT_OPTIONS).map((entry) =>
            ShopFormatter.applyEmoji(
              new StringSelectMenuOptionBuilder()
                .setLabel(entry.shopItem.name.slice(0, 100))
                .setDescription(`В наличии: ${entry.quantity} шт.`)
                .setValue(entry.shopItemId),
              entry.shopItem.emoji,
            ),
          ),
        ),
    );
  }
}
