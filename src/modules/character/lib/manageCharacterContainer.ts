import {
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
  RollEntry,
} from "../../../database/generated/prisma/client.js";

import { Storage } from "../../../lib/storage.js";
import { CharacterFormatter } from "../../economy/lib/characterFormatter.js";
import { Currency } from "../../economy/lib/currency.js";
import { Mana } from "../../spells/lib/mana.js";
import {
  CharacterTab,
  ManageCharacterAction,
  type InventoryListItem,
} from "../types/character.js";
import { ManageCharacterComponents } from "./manageCharacterComponents.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const HEADER = "<:sec_characters:1562521773789155450>";
const SUCCESS = "<:312537mark:1518581040548024430>";
const PAD = "⠀".repeat(60);
const MAX_IMAGE_ITEMS = 6;

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
  [ManageCharacterAction.Familiar]: "Фамильяр персонажа",
  [ManageCharacterAction.FamiliarDelete]: "Отвязка фамильяра",
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
  [ManageCharacterAction.Familiar]: "получил фамильяра",
  [ManageCharacterAction.FamiliarDelete]: "лишился фамильяра",
};

export type ManagedCharacter = Character & {
  tupper?: { name: string; prefix: string } | null;
  familiar?: CharacterFamiliar | null;
  trait?: RollEntry | null;
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
    tab: CharacterTab,
    notice: string | null = null,
    traits: RollEntry[] = [],
  ) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    const header = new TextDisplayBuilder().setContent(
      [
        `# ${character.rpName}`,
        `-# Игрок: **${memberName}** · <@${discordId}>`,
        `-# ${CharacterFormatter.faculty(character.faculty)} · ${CharacterFormatter.status(character.status)}`,
        notice ? `${SUCCESS} ${notice}` : null,
        `-# ${PAD}`,
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

    container.addActionRowComponents(
      ManageCharacterComponents.tabSelect(discordId, character.id, tab),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );

    switch (tab) {
      case CharacterTab.Inventory:
        this.inventoryTab(container, items);
        break;

      case CharacterTab.Stats:
        this.statsTab(container, character);
        break;

      case CharacterTab.Familiar:
        this.familiarTab(container, character.familiar ?? null);
        break;

      case CharacterTab.Status:
        this.statusTab(container, character);
        break;

      default:
        this.profileTab(container, character);
    }

    if (tab === CharacterTab.Profile && traits.length) {
      container.addActionRowComponents(
        ManageCharacterComponents.traitSelect(discordId, character.id, traits, character.traitId),
      );
    }

    container.addActionRowComponents(
      ManageCharacterComponents.tabActions(discordId, character, tab, Boolean(character.familiar)),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(ManageCharacterComponents.navRow(discordId));

    return container;
  }

  private static text(container: ContainerBuilder, lines: (string | null)[]) {
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        lines.filter((line) => line !== null).join("\n"),
      ),
    );
  }

  private static profileTab(container: ContainerBuilder, character: ManagedCharacter) {
    this.text(container, [
      "### <:928205membericon:1518581050555633674> Профиль",
      `> **Возраст:** ${character.age !== null ? CharacterFormatter.age(character.age) : "не указан"}`,
      `> **Факультет:** ${CharacterFormatter.faculty(character.faculty)}`,
      `> **Особая роль:** ${character.specialRole ?? "нет"}`,
      `> **Магический дар:** ${CharacterFormatter.trait(character.trait ?? null)}`,
      `> **Таппер:** ${character.tupper ? `${character.tupper.name} · \`${character.tupper.prefix}\`` : "не настроен"}`,
      "-# Имя, возраст, факультет, особая роль и аватар меняются через «Изменить анкету», магический дар — в меню ниже.",
    ]);
  }

  private static inventoryTab(container: ContainerBuilder, items: InventoryListItem[]) {
    const line = (item: InventoryListItem) => `${ARROW} **${item.name}** × ${item.quantity}`;

    const withImages = items
      .map((item) => ({ item, url: Storage.url(item.imagePath) }))
      .filter((entry): entry is { item: InventoryListItem; url: string } => entry.url !== null)
      .slice(0, MAX_IMAGE_ITEMS);

    const rest = items.filter((item) => !withImages.some((entry) => entry.item === item));
    const shown = rest.slice(0, 20);

    this.text(container, [
      "### <:inventory:1562485572008673340> Инвентарь",
      items.length ? null : "-# Инвентарь пуст.",
    ]);

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
      this.text(container, [
        shown.map(line).join("\n"),
        rest.length > shown.length ? `-# …и ещё ${rest.length - shown.length}` : null,
      ]);
    }
  }

  private static statsTab(container: ContainerBuilder, character: ManagedCharacter) {
    const mana = Mana.current(character);
    const timeToFull = Mana.timeToFull(mana, character.maxMana);

    this.text(container, [
      "### <:mana_flask:1562520781165035583> Мана и деньги",
      `> **Мана:** ${Mana.format(mana, character.maxMana)}`,
      `> ${Mana.caption(mana, character.maxMana, timeToFull)}`,
      `> **Баланс:** ${Currency.inline(character.balanceKnuts)}`,
    ]);
  }

  private static familiarTab(container: ContainerBuilder, familiar: CharacterFamiliar | null) {
    if (!familiar) {
      this.text(container, [
        "### <:familiar:1562485560533319720> Фамильяр",
        `${ARROW} У персонажа нет фамильяра.`,
        "-# Добавьте фамильяра: имя, описание и изображение. Игрок увидит его в карточке персонажа.",
      ]);

      return;
    }

    this.text(container, [
      `### <:familiar:1562485560533319720> ${familiar.name}`,
      familiar.description.slice(0, 1500),
    ]);

    const image = Storage.url(familiar.imagePath);

    if (image) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(image).setDescription(familiar.name.slice(0, 1024)),
        ),
      );
    }
  }

  private static statusTab(container: ContainerBuilder, character: ManagedCharacter) {
    this.text(container, [
      "### <:char_frozen:1562490458725425172> Статус",
      `> **Сейчас:** ${CharacterFormatter.status(character.status)}`,
      "-# Замороженный персонаж не участвует в игре, но сохраняет всё имущество. Умерщвление меняет статус на «Мёртв», удаление стирает персонажа полностью.",
    ]);
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
            ? "-# Персонаж, его деньги, история, таппер и фамильяр будут удалены без возможности восстановления."
            : action === ManageCharacterAction.FamiliarDelete
              ? "-# Фамильяр и его изображение будут удалены."
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
      ManageCharacterComponents.characterRow(discordId, character.id, CharacterTab.Inventory),
    );

    return container;
  }
}
