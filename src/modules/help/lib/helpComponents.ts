import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

import type { HelpPage } from "../types/help.js";
import { HelpCustomIds } from "./helpCustomIds.js";

const MAX_SELECT_OPTIONS = 25;

export class HelpComponents {
  public static categorySelect(help: HelpPage) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(HelpCustomIds.category(help.mask))
        .setPlaceholder("Выберите категорию")
        .addOptions(
          help.pages.slice(0, MAX_SELECT_OPTIONS).map((page, index) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(page.category.label)
              .setDescription(this.commandCount(page.commands.length))
              .setEmoji(page.category.emoji)
              .setValue(String(index))
              .setDefault(index === help.index),
          ),
        ),
    );
  }

  public static navigation(help: HelpPage) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(HelpCustomIds.page(help.index - 1, help.mask))
        .setLabel("Назад")
        .setEmoji("<:26204blackarrow:1518587278467792997>")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(help.index <= 0),

      new ButtonBuilder()
        .setCustomId(HelpCustomIds.page(help.index + 1, help.mask))
        .setLabel("Вперёд")
        .setEmoji("<:48765whitearrow:1518587298281685173>")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(help.index >= help.pages.length - 1),
    );
  }

  public static commandCount(count: number) {
    const mod10 = count % 10;
    const mod100 = count % 100;

    if (mod10 === 1 && mod100 !== 11) {
      return `${count} команда`;
    }

    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
      return `${count} команды`;
    }

    return `${count} команд`;
  }
}
