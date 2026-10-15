import {
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from "discord.js";

import type { ManageSection, MemberOption } from "../types/manage.js";
import { ManageComponents } from "./manageComponents.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const HEADER = "<:563621mod8:1518587360886128661>";

export class ManageContainer {
  public static hub(sections: ManageSection[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${HEADER} Панель управления`,
          "",
          `${ARROW} Выберите систему, которую хотите настроить.`,
          "-# Панель доступна только вам. Действия применяются на сервере сразу.",
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        sections
          .map(
            (section) =>
              `${section.emoji} **${section.label}**\n-# ${section.description}`,
          )
          .join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(ManageComponents.sectionSelect(sections));

    return container;
  }

  public static memberResults(
    title: string,
    query: string,
    members: MemberOption[],
    selectCustomId: string,
    searchCustomId: string,
  ) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${HEADER} ${title}`,
          "",
          members.length
            ? `${ARROW} Найдено игроков по запросу «${query}»: **${members.length}**`
            : `${ARROW} По запросу «${query}» никого не найдено.`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    if (members.length) {
      container.addActionRowComponents(
        ManageComponents.memberSelect(selectCustomId, members),
      );
    }

    container.addActionRowComponents(
      ManageComponents.homeRow().addComponents(
        ManageComponents.memberSearchButton(searchCustomId, "Искать снова"),
      ),
    );

    return container;
  }

  public static notice(title: string, message: string) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [`# ${title}`, "", `${ARROW} ${message}`].join("\n"),
      ),
    );

    return container;
  }

  public static error(message: string) {
    const container = this.notice(
      "<:240191mark:1518581039172292688> Ошибка",
      message,
    );

    container.addActionRowComponents(ManageComponents.homeRow());

    return container;
  }
}
