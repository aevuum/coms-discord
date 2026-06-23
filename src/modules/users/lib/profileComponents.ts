import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";

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
          new StringSelectMenuOptionBuilder()
            .setLabel("Статистика")
            .setValue("stats")
            .setEmoji("<:1821serversfolder:1518587234163622040>"),
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
}
