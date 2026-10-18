import {
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from "discord.js";

import type { Character } from "../../../database/generated/prisma/client.js";

import { CharacterFormatter } from "../../economy/lib/characterFormatter.js";
import { ManageComponents } from "../../manage/lib/manageComponents.js";
import {
  ManageCharacterAction,
  type InventoryListItem,
} from "../types/character.js";
import {
  CHARACTER_CATEGORIES,
  ManageCharacterComponents,
} from "./manageCharacterComponents.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const HEADER = "<:563621mod8:1518587360886128661>";

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

const ACTION_RESULTS: Record<ManageCharacterAction, string> = {
  [ManageCharacterAction.Create]: "создан",
  [ManageCharacterAction.Delete]: "удалён",
  [ManageCharacterAction.Freeze]: "заморожен",
  [ManageCharacterAction.Unfreeze]: "разморожен",
  [ManageCharacterAction.Kill]: "мёртв",
  [ManageCharacterAction.GiveItem]: "получил предмет",
  [ManageCharacterAction.TakeItem]: "лишился предмета",
  [ManageCharacterAction.SetMana]: "получил новую ману",
  [ManageCharacterAction.SetBalance]: "получил новый баланс",
  [ManageCharacterAction.Edit]: "изменён",
};

export class ManageCharacterContainer {
  public static root() {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${HEADER} Управление персонажами`,
          "",
          `${ARROW} Выберите категорию действий.`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        CHARACTER_CATEGORIES.map(
          (category) =>
            `${category.emoji} **${category.label}**\n-# ${category.description}`,
        ).join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(ManageCharacterComponents.categoryButtons());

    container.addActionRowComponents(ManageComponents.homeRow());

    return container;
  }

  public static category(category: (typeof CHARACTER_CATEGORIES)[number]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${category.emoji} ${category.label}`,
          "",
          `${ARROW} ${category.description}.`,
          "-# Выберите действие, затем найдите игрока по нику или ID.",
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      ManageCharacterComponents.categoryActions(category),
    );

    container.addActionRowComponents(ManageCharacterComponents.backRow());

    return container;
  }

  public static characterSelection(
    action: ManageCharacterAction,
    memberName: string,
    discordId: string,
    characters: Character[],
  ) {
    if (!characters.length) {
      return this.result(
        ACTION_TITLES[action],
        `У игрока **${memberName}** нет персонажей.`,
      );
    }

    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${HEADER} ${ACTION_TITLES[action]}`,
          "",
          `${ARROW} Игрок: **${memberName}**. Выберите персонажа.`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      ManageCharacterComponents.characterSelect(action, discordId, characters),
    );

    container.addActionRowComponents(ManageCharacterComponents.backRow());

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

  public static done(action: ManageCharacterAction, characterName: string) {
    return this.result(
      ACTION_TITLES[action],
      `Персонаж **${characterName}** ${ACTION_RESULTS[action]}.`,
    );
  }

  public static takeSelection(
    discordId: string,
    character: Character,
    items: InventoryListItem[],
  ) {
    if (!items.length) {
      return this.result(
        ACTION_TITLES[ManageCharacterAction.TakeItem],
        `В инвентаре **${character.rpName}** нет предметов.`,
      );
    }

    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${HEADER} ${ACTION_TITLES[ManageCharacterAction.TakeItem]}`,
          "",
          `${ARROW} Персонаж: **${character.rpName}**`,
          "",
          items.map((item) => `${ARROW} **${item.name}** × ${item.quantity}`).join("\n"),
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      ManageCharacterComponents.itemSelect(discordId, character.id, items),
    );

    container.addActionRowComponents(ManageCharacterComponents.backRow());

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

    container.addActionRowComponents(ManageCharacterComponents.backRow());

    return container;
  }
}
