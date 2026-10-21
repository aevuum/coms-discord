import {
  ContainerBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from "discord.js";

import type { Character } from "../../../database/generated/prisma/client.js";

import { Storage } from "../../../lib/storage.js";
import { CharacterFormatter } from "../../economy/lib/characterFormatter.js";
import { Currency } from "../../economy/lib/currency.js";
import { Mana } from "../../spells/lib/mana.js";
import {
  ManageCharacterAction,
  type InventoryListItem,
} from "../types/character.js";
import { ManageCharacterComponents } from "./manageCharacterComponents.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const HEADER = "<:563621mod8:1518587360886128661>";
const SUCCESS = "<:312537mark:1518581040548024430>";
const PAD = "⠀".repeat(60);
const MAX_IMAGE_ITEMS = 4;

export const ACTION_TITLES: Record<ManageCharacterAction, string> = {
  [ManageCharacterAction.Create]: "Создание персонажа",
  [ManageCharacterAction.Delete]: "Удаление персонажа",
  [ManageCharacterAction.Freeze]: "Заморозка персонажа",
  [ManageCharacterAction.Unfreeze]: "Разморозка персонажа",
  [ManageCharacterAction.Kill]: "Умерщвление персонажа",
  [ManageCharacterAction.GiveItem]: "Выдача предмета",
  [ManageCharacterAction.TakeItem]: "Изъятие предмета",
  [ManageCharacterAction.SetMana]: "Установка маны",
  [ManageCharacterAction.SetBalance]: "Баланс персонажа",
  [ManageCharacterAction.Edit]: "Изменение персонажа",
};

export const ACTION_RESULTS: Record<ManageCharacterAction, string> = {
  [ManageCharacterAction.Create]: "создан",
  [ManageCharacterAction.Delete]: "удалён",
  [ManageCharacterAction.Freeze]: "заморожен",
  [ManageCharacterAction.Unfreeze]: "снова активен",
  [ManageCharacterAction.Kill]: "мёртв",
  [ManageCharacterAction.GiveItem]: "получил предмет",
  [ManageCharacterAction.TakeItem]: "лишился предмета",
  [ManageCharacterAction.SetMana]: "получил новую ману",
  [ManageCharacterAction.SetBalance]: "получил новый баланс",
  [ManageCharacterAction.Edit]: "изменён",
};

export type ManagedCharacter = Character & {
  tupper?: { name: string; prefix: string } | null;
};

export class ManageCharacterContainer {
  public static root() {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${HEADER} Управление персонажами`,
          "",
          `${ARROW} Найдите игрока по нику или ID. После этого откроется его карточка: там можно создать персонажа или выбрать существующего и выполнять с ним любые действия без повторного поиска.`,
          `-# ${PAD}`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(ManageCharacterComponents.rootRow());

    return container;
  }

  public static player(
    memberName: string,
    discordId: string,
    characters: Character[],
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
          characters.length
            ? characters
                .map(
                  (character) =>
                    `${ARROW} **${character.rpName}** · ${CharacterFormatter.faculty(character.faculty)} · ${CharacterFormatter.status(character.status)}`,
                )
                .join("\n")
            : `${ARROW} У игрока пока нет персонажей.`,
          `-# ${PAD}`,
        ]
          .filter((line) => line !== null)
          .join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      ...ManageCharacterComponents.playerRows(discordId, characters),
    );

    return container;
  }

  public static dashboard(
    memberName: string,
    discordId: string,
    character: ManagedCharacter,
    items: InventoryListItem[],
    notice: string | null = null,
  ) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    const mana = Mana.current(character);

    const header = new TextDisplayBuilder().setContent(
      [
        `# ${character.rpName}`,
        `-# Игрок: **${memberName}** · <@${discordId}>`,
        notice ? `${SUCCESS} ${notice}` : null,
        "",
        `> **Возраст:** ${character.age !== null ? CharacterFormatter.age(character.age) : "не указан"}`,
        `> **Статус:** ${CharacterFormatter.status(character.status)}`,
        `> **Особая роль:** ${character.specialRole ?? "нет"}`,
        `> **Факультет:** ${CharacterFormatter.faculty(character.faculty)}`,
        `> **Мана:** ${Mana.format(mana, character.maxMana)}`,
        `> **Баланс:** ${Currency.inline(character.balanceKnuts)}`,
        character.tupper
          ? `> **Таппер:** ${character.tupper.name} · \`${character.tupper.prefix}\``
          : null,
      ]
        .filter((line) => line !== null)
        .join("\n"),
    );

    const avatar = Storage.media(character.avatarPath, character.avatarUrl);

    if (avatar) {
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(header)
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatar)),
      );
    } else {
      container.addTextDisplayComponents(header);
    }

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );

    const line = (item: InventoryListItem) => `${ARROW} **${item.name}** × ${item.quantity}`;

    const withImages = items
      .map((item) => ({ item, url: Storage.url(item.imagePath) }))
      .filter((entry): entry is { item: InventoryListItem; url: string } => entry.url !== null)
      .slice(0, MAX_IMAGE_ITEMS);

    const rest = items.filter((item) => !withImages.some((entry) => entry.item === item));
    const shown = rest.slice(0, 20);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "### <:527877discordlegendchest:1518587359136972930> Инвентарь",
          items.length ? null : "-# Инвентарь пуст.",
          `-# ${PAD}`,
        ]
          .filter((entry) => entry !== null)
          .join("\n"),
      ),
    );

    for (const { item, url } of withImages) {
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(line(item)))
          .setThumbnailAccessory(
            new ThumbnailBuilder()
              .setURL(url)
              .setDescription(item.name.slice(0, 1024)),
          ),
      );
    }

    if (shown.length) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            shown.map(line).join("\n"),
            rest.length > shown.length ? `-# …и ещё ${rest.length - shown.length}` : null,
          ]
            .filter((entry) => entry !== null)
            .join("\n"),
        ),
      );
    }

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      ...ManageCharacterComponents.dashboardRows(discordId, character),
    );

    return container;
  }

  public static confirm(
    action: ManageCharacterAction,
    discordId: string,
    character: Character,
  ) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${HEADER} ${ACTION_TITLES[action]}`,
          "",
          `${ARROW} Персонаж: **${character.rpName}** · ${CharacterFormatter.faculty(character.faculty)}`,
          action === ManageCharacterAction.Delete
            ? "-# Персонаж, его деньги, история и таппер будут удалены без возможности восстановления."
            : "-# Статус персонажа изменится на «Мёртв».",
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      ManageCharacterComponents.confirm(action, discordId, character.id),
    );

    return container;
  }

  public static takeSelection(
    discordId: string,
    character: Character,
    items: InventoryListItem[],
  ) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${HEADER} ${ACTION_TITLES[ManageCharacterAction.TakeItem]}`,
          "",
          `${ARROW} Персонаж: **${character.rpName}**`,
          items.length ? "-# Выберите предмет, который нужно забрать." : `${ARROW} В инвентаре нет предметов.`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    if (items.length) {
      container.addActionRowComponents(
        ManageCharacterComponents.itemSelect(discordId, character.id, items),
      );
    }

    container.addActionRowComponents(
      ManageCharacterComponents.characterRow(discordId, character.id),
    );

    return container;
  }
}
