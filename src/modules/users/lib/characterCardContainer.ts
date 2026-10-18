import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from "discord.js";

import type {
  Character,
  CharacterTupper,
} from "../../../database/generated/prisma/client.js";

import { CharacterFormatter } from "../../economy/lib/characterFormatter.js";
import { Mana } from "../../spells/lib/mana.js";
import { TupperCustomIds } from "../../tupper/lib/tupperCustomIds.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const POTION = "<:29865potionwhite:1518587289989550100>";
const CHEST = "<:527877discordlegendchest:1518587359136972930>";
const MEMBER = "<:928205membericon:1518581050555633674>";

type CardCharacter = Character & {
  tupper: CharacterTupper | null;
};

export type CardItem = {
  name: string;
  quantity: number;
  attachmentName: string | null;
};

export const MAX_IMAGE_ITEMS = 8;

export class CharacterCardContainer {
  public static build(character: CardCharacter, items: CardItem[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    const header = new TextDisplayBuilder().setContent(
      [
        `# ${MEMBER} ${character.rpName}`,
        `${ARROW} ${CharacterFormatter.faculty(character.faculty)}`,
        `${ARROW} ${CharacterFormatter.status(character.status)}`,
        character.age !== null ? `${ARROW} Возраст: ${CharacterFormatter.age(character.age)}` : null,
        "-# Эта карточка видна только вам.",
      ]
        .filter((line) => line !== null)
        .join("\n"),
    );

    if (character.avatarUrl) {
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(header)
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(character.avatarUrl),
          ),
      );
    } else {
      container.addTextDisplayComponents(header);
    }

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    const mana = Mana.current(character);

    const timeToFull = Mana.timeToFull(mana, character.maxMana);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `### ${POTION} Мана`,
          Mana.format(mana, character.maxMana),
          timeToFull
            ? `-# Полное восстановление через ${timeToFull}`
            : "-# Мана полностью восстановлена",
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `### ${CHEST} Инвентарь`,
          items.length ? null : "-# Инвентарь пуст.",
        ]
          .filter((line) => line !== null)
          .join("\n"),
      ),
    );

    const withImages = items
      .filter((item) => item.attachmentName)
      .slice(0, MAX_IMAGE_ITEMS);

    for (const item of withImages) {
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(this.itemLine(item)),
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder()
              .setURL(`attachment://${item.attachmentName}`)
              .setDescription(item.name.slice(0, 1024)),
          ),
      );
    }

    const withoutImages = items.filter((item) => !withImages.includes(item));

    if (withoutImages.length) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          withoutImages.map((item) => this.itemLine(item)).join("\n"),
        ),
      );
    }

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `### <a:83918animatedarrowgreen:1518587316879495249> Таппер`,
          character.tupper
            ? `${ARROW} Имя: **${character.tupper.name}** · Тег: \`${character.tupper.prefix}\``
            : `${ARROW} Таппер ещё не настроен.`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(TupperCustomIds.open(character.id))
          .setLabel("Редактировать таппер")
          .setEmoji("<:479873settingsna:1518581042456432791>")
          .setStyle(ButtonStyle.Primary),
      ),
    );

    return container;
  }

  private static itemLine(item: CardItem) {
    return `${ARROW} **${item.name}** × ${item.quantity}`;
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
}
