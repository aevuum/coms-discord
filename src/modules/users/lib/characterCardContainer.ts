import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from "discord.js";

import type {
  Character,
  CharacterFamiliar,
  CharacterTupper,
} from "../../../database/generated/prisma/client.js";

import { Storage } from "../../../lib/storage.js";
import { CharacterFormatter } from "../../economy/lib/characterFormatter.js";
import { Mana } from "../../spells/lib/mana.js";
import { TupperCustomIds } from "../../tupper/lib/tupperCustomIds.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const CHEST = "<:inventory:1562485572008673340>";
const FEATHER = "<:familiar:1562485560533319720>";

const PAD = "⠀".repeat(60);

export const FAMILIAR_CARD_PREFIX = "cardfam";

export enum FamiliarCardAction {
  View = "view",
  Back = "back",
}

type CardCharacter = Character & {
  tupper: CharacterTupper | null;
  familiar: CharacterFamiliar | null;
};

export type CardItem = {
  name: string;
  quantity: number;
  imageUrl: string | null;
};

export const MAX_IMAGE_ITEMS = 8;

export class CharacterCardContainer {
  public static build(character: CardCharacter, items: CardItem[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    const mana = Mana.current(character);

    const header = new TextDisplayBuilder().setContent(
      [
        `## ${this.title(character)}`,
        `> **Статус персонажа:** ${CharacterFormatter.status(character.status)}`,
        `> **Мана:** ${Mana.format(mana, character.maxMana)}`,
        `> ${Mana.caption(mana, character.maxMana, Mana.timeToFull(mana, character.maxMana))}`,
        `-# ${PAD}`,
      ].join("\n"),
    );

    const avatar = Storage.media(character.avatarPath, character.avatarUrl);

    if (avatar) {
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(header)
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(avatar),
          ),
      );
    } else {
      container.addTextDisplayComponents(header);
    }

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `### ${FEATHER} Фамильяр`,
          character.familiar
            ? `${ARROW} **${character.familiar.name}**`
            : `${ARROW} Фамильяра пока нет.`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${CHEST} Инвентарь`,
          items.length ? null : "-# Инвентарь пуст.",
        ]
          .filter((line) => line !== null)
          .join("\n"),
      ),
    );

    const withImages = items
      .filter((item) => item.imageUrl)
      .slice(0, MAX_IMAGE_ITEMS);

    for (const item of withImages) {
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(this.itemLine(item)),
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder()
              .setURL(item.imageUrl!)
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
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        character.tupper
          ? `-# Таппер: **${character.tupper.name}** · тег \`${character.tupper.prefix}\``
          : "-# Таппер ещё не настроен.",
      ),
    );

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(this.customId(FamiliarCardAction.View, character.id))
          .setLabel("Просмотреть фамильяра")
          .setEmoji(FEATHER)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!character.familiar),
        new ButtonBuilder()
          .setCustomId(TupperCustomIds.open(character.id))
          .setLabel("Изменить таппер")
          .setEmoji("<:479873settingsna:1518581042456432791>")
          .setStyle(ButtonStyle.Secondary),
      ),
    );

    return container;
  }

  public static familiar(character: Character, familiar: CharacterFamiliar) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${FEATHER} ${familiar.name}`,
          `-# Фамильяр персонажа **${character.rpName}**`,
          "",
          familiar.description,
          `-# ${PAD}`,
        ].join("\n"),
      ),
    );

    const image = Storage.url(familiar.imagePath);

    if (image) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder()
            .setURL(image)
            .setDescription(familiar.name.slice(0, 1024)),
        ),
      );
    }

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(this.customId(FamiliarCardAction.Back, character.id))
          .setLabel("К персонажу")
          .setEmoji("<:26204blackarrow:1518587278467792997>")
          .setStyle(ButtonStyle.Secondary),
      ),
    );

    return container;
  }

  public static customId(action: FamiliarCardAction, characterId: string) {
    return `${FAMILIAR_CARD_PREFIX}:${action}:${characterId}`;
  }

  private static title(character: CardCharacter) {
    const age = character.age !== null ? `, ${CharacterFormatter.age(character.age)}` : "";
    const role = character.specialRole ? ` | ${character.specialRole}` : "";

    return `${character.rpName}${age} (${CharacterFormatter.facultyLabel(character.faculty)})${role}`;
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
