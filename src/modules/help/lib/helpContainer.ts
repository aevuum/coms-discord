import {
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from "discord.js";

import type { HelpCommandEntry, HelpPage } from "../types/help.js";
import { HelpComponents } from "./helpComponents.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";

export class HelpContainer {
  public static page(help: HelpPage) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    const current = help.pages[help.index];

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:6849serverguide:1518587250802426078> Помощь",
          "",
          `${ARROW} Здесь собраны все команды, которые вам доступны.`,
          `-# Категория ${help.index + 1} из ${help.pages.length}`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `## ${current.category.emoji} ${current.category.label}`,
          `-# ${current.category.description}`,
          "",
          current.commands.map((command) => this.entry(command)).join("\n\n"),
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(HelpComponents.categorySelect(help));

    if (help.pages.length > 1) {
      container.addActionRowComponents(HelpComponents.navigation(help));
    }

    return container;
  }

  public static error(message: string) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:240191mark:1518581039172292688> Ошибка",
          "",
          `${ARROW} ${message}`,
        ].join("\n"),
      ),
    );

    return container;
  }

  private static entry(command: HelpCommandEntry) {
    return [
      `${ARROW} ${command.mention}${command.usage ? ` \`${command.usage}\`` : ""}`,
      `-# ${command.description}`,
    ].join("\n");
  }
}
