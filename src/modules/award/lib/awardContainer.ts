import {
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from "discord.js";

import type { Award } from "../../../database/generated/prisma/client.js";

import { ManageComponents } from "../../manage/lib/manageComponents.js";
import { AwardComponents } from "./awardComponents.js";
import { AwardAction, AwardCustomIds } from "./awardCustomIds.js";
import { AwardFormatter } from "./awardFormatter.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const HEADER = "<:sec_rewards:1562521791329468467>";
const SUCCESS = "<:312537mark:1518581040548024430>";
const MAX_LISTED = 20;

export class AwardContainer {
  public static root(awards: Award[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${HEADER} Награды`,
          "",
          `${ARROW} Создавайте награды, выдавайте и снимайте их у игроков.`,
          "-# При выдаче игрок получает COMS награды, при снятии они списываются.",
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        awards.length
          ? [
              ...awards
                .slice(0, MAX_LISTED)
                .map(
                  (award) =>
                    `${award.emoji} **${award.label}** · ${AwardFormatter.rarity(award.rarity)} · ${award.rewardComsCoins} COMS`,
                ),
              awards.length > MAX_LISTED
                ? `-# …и ещё ${awards.length - MAX_LISTED}`
                : null,
            ]
              .filter((line) => line !== null)
              .join("\n")
          : `${ARROW} Наград пока нет.`,
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      AwardComponents.rootActions(awards.length > 0),
    );

    container.addActionRowComponents(ManageComponents.homeRow());

    return container;
  }

  public static selectToDelete(awards: Award[]) {
    return this.selection(
      "Удаление награды",
      "Выберите награду, которую нужно удалить.",
      AwardComponents.awardSelect(
        AwardCustomIds.build(AwardAction.DeleteSelect),
        awards,
        "Выберите награду",
      ),
    );
  }

  public static player(
    memberName: string,
    discordId: string,
    awards: Award[],
    owned: Award[],
    notice: string | null = null,
  ) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${HEADER} ${memberName}`,
          `-# <@${discordId}> · ${discordId}`,
          notice ? `${SUCCESS} ${notice}` : null,
          "",
          owned.length
            ? owned
                .slice(0, MAX_LISTED)
                .map((award) => `${award.emoji} **${award.label}** · ${AwardFormatter.rarity(award.rarity)}`)
                .join("\n")
            : `${ARROW} У игрока пока нет наград.`,
          "-# Выдавайте и снимайте награды в меню ниже — игрок остаётся выбранным.",
        ]
          .filter((line) => line !== null)
          .join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      ...AwardComponents.playerRows(discordId, awards, owned),
    );

    return container;
  }

  public static deleteConfirm(award: Award) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:14605delete:1518587266505642074> Удаление награды",
          "",
          `${ARROW} Удалить награду ${award.emoji} **${award.label}**?`,
          "-# Награда пропадёт у всех игроков. Начисленные COMS не списываются.",
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(AwardComponents.deleteConfirm(award));

    return container;
  }

  public static result(title: string, message: string) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [`# ${HEADER} ${title}`, "", `${ARROW} ${message}`].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(AwardComponents.backRow());

    return container;
  }

  private static selection(
    title: string,
    message: string,
    select: ReturnType<typeof AwardComponents.awardSelect>,
  ) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [`# ${HEADER} ${title}`, "", `${ARROW} ${message}`].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(select);

    container.addActionRowComponents(AwardComponents.backRow());

    return container;
  }
}
