import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  FileUploadBuilder,
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import {
  CharacterFaculty,
  CharacterStatus,
  type Character,
  type CharacterFamiliar,
} from "../../../database/generated/prisma/client.js";

import { CharacterFormatter } from "../../economy/lib/characterFormatter.js";
import { Currency } from "../../economy/lib/currency.js";
import { ManageComponents } from "../../manage/lib/manageComponents.js";
import { Mana } from "../../spells/lib/mana.js";
import {
  ACTION_TABS,
  CharacterTab,
  ManageCharacterAction,
  type InventoryListItem,
} from "../types/character.js";
import {
  CharacterCustomIds,
  CharacterModalFields,
  CharacterPanelAction,
} from "./characterCustomIds.js";

const FACULTY_ORDER: CharacterFaculty[] = [
  CharacterFaculty.GRYFFINDOR,
  CharacterFaculty.SLYTHERIN,
  CharacterFaculty.HUFFLEPUFF,
  CharacterFaculty.RAVENCLAW,
  CharacterFaculty.ADULT,
];

export const CHARACTER_TABS: {
  id: CharacterTab;
  label: string;
  description: string;
  emoji: string;
}[] = [
  { id: CharacterTab.Profile, label: "Профиль", description: "Анкета, возраст, факультет, особая роль", emoji: "<:928205membericon:1518581050555633674>" },
  { id: CharacterTab.Inventory, label: "Инвентарь", description: "Выдача и изъятие предметов", emoji: "<:inventory:1562485572008673340>" },
  { id: CharacterTab.Stats, label: "Мана и деньги", description: "Текущая мана и баланс персонажа", emoji: "<:29865potionwhite:1518587289989550100>" },
  { id: CharacterTab.Familiar, label: "Фамильяр", description: "Регистрация и привязка фамильяра", emoji: "<:familiar:1562485560533319720>" },
  { id: CharacterTab.Status, label: "Статус", description: "Заморозка, смерть и удаление", emoji: "<:char_frozen:1562490458725425172>" },
];

export class ManageCharacterComponents {
  public static searchButton(label = "Найти игрока") {
    return ManageComponents.memberSearchButton(
      CharacterCustomIds.build(CharacterPanelAction.Start),
      label,
    );
  }

  public static rootRow() {
    return ManageComponents.homeRow().addComponents(this.searchButton());
  }

  public static playerRows(discordId: string, characters: Character[]) {
    const rows: ActionRowBuilder<StringSelectMenuBuilder | ButtonBuilder>[] = [];

    if (characters.length) {
      rows.push(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(CharacterCustomIds.build(CharacterPanelAction.Pick, discordId))
            .setPlaceholder("Выберите персонажа")
            .addOptions(
              characters.slice(0, 25).map((character) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(character.rpName.slice(0, 100))
                  .setDescription(
                    `${CharacterFormatter.statusLabel(character.status)} · ${CharacterFormatter.facultyLabel(character.faculty)}`,
                  )
                  .setEmoji(CharacterFormatter.facultyEmoji(character.faculty))
                  .setValue(character.id),
              ),
            ),
        ),
      );
    }

    rows.push(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(CharacterCustomIds.build(CharacterPanelAction.Create, discordId))
          .setLabel("Создать персонажа")
          .setEmoji("<:6509addguild:1518587247769817088>")
          .setStyle(ButtonStyle.Success),
        this.searchButton("Другой игрок").setStyle(ButtonStyle.Secondary),
        ManageComponents.homeButton(),
      ),
    );

    return rows;
  }

  public static tabSelect(discordId: string, characterId: string, tab: CharacterTab) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(CharacterCustomIds.build(CharacterPanelAction.Tab, discordId, characterId))
        .addOptions(
          CHARACTER_TABS.map((entry) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(entry.label)
              .setDescription(entry.description)
              .setEmoji(entry.emoji)
              .setValue(entry.id)
              .setDefault(entry.id === tab),
          ),
        ),
    );
  }

  public static tabActions(
    discordId: string,
    character: Character,
    tab: CharacterTab,
    hasFamiliar: boolean,
  ) {
    const act = (
      action: ManageCharacterAction,
      label: string,
      emoji: string,
      style: ButtonStyle,
    ) =>
      new ButtonBuilder()
        .setCustomId(
          CharacterCustomIds.build(CharacterPanelAction.Act, action, discordId, character.id),
        )
        .setLabel(label)
        .setEmoji(emoji)
        .setStyle(style);

    const row = new ActionRowBuilder<ButtonBuilder>();

    switch (tab) {
      case CharacterTab.Inventory:
        return row.addComponents(
          act(ManageCharacterAction.GiveItem, "Выдать предмет", "<:inventory:1562485572008673340>", ButtonStyle.Success),
          act(ManageCharacterAction.TakeItem, "Забрать предмет", "<:12138cross:1518587259669053591>", ButtonStyle.Secondary),
        );

      case CharacterTab.Stats:
        return row.addComponents(
          act(ManageCharacterAction.SetMana, "Изменить ману", "<:29865potionwhite:1518587289989550100>", ButtonStyle.Primary),
          act(ManageCharacterAction.SetBalance, "Изменить баланс", "<:galleon:1521547045268099242>", ButtonStyle.Primary),
        );

      case CharacterTab.Familiar:
        row.addComponents(
          act(
            ManageCharacterAction.Familiar,
            hasFamiliar ? "Изменить фамильяра" : "Добавить фамильяра",
            hasFamiliar ? "<:984149edit:1518587370474176612>" : "<:6509addguild:1518587247769817088>",
            hasFamiliar ? ButtonStyle.Primary : ButtonStyle.Success,
          ),
        );

        if (hasFamiliar) {
          row.addComponents(
            act(ManageCharacterAction.FamiliarDelete, "Отвязать", "<:14605delete:1518587266505642074>", ButtonStyle.Danger),
          );
        }

        return row;

      case CharacterTab.Status:
        return row.addComponents(
          character.status === CharacterStatus.ALIVE
            ? act(ManageCharacterAction.Freeze, "Заморозить", "<:char_frozen:1562490458725425172>", ButtonStyle.Secondary)
            : act(
                ManageCharacterAction.Unfreeze,
                character.status === CharacterStatus.DEAD ? "Вернуть к жизни" : "Разморозить",
                "<:char_active:1562490460759531541>",
                ButtonStyle.Primary,
              ),
          act(ManageCharacterAction.Kill, "Умертвить", "<:char_dead:1562490456783462450>", ButtonStyle.Danger)
            .setDisabled(character.status === CharacterStatus.DEAD),
          act(ManageCharacterAction.Delete, "Удалить персонажа", "<:14605delete:1518587266505642074>", ButtonStyle.Danger),
        );

      default:
        return row.addComponents(
          act(ManageCharacterAction.Edit, "Изменить анкету", "<:984149edit:1518587370474176612>", ButtonStyle.Primary),
        );
    }
  }

  public static navRow(discordId: string) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      this.playerButton(discordId, "Все персонажи"),
      this.searchButton("Другой игрок").setStyle(ButtonStyle.Secondary),
      ManageComponents.homeButton(),
    );
  }

  public static familiarModal(
    discordId: string,
    character: Character,
    familiar: CharacterFamiliar | null,
  ) {
    const name = new TextInputBuilder()
      .setCustomId(CharacterModalFields.FamiliarName)
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(2)
      .setMaxLength(80);

    const description = new TextInputBuilder()
      .setCustomId(CharacterModalFields.FamiliarDescription)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(1500);

    if (familiar) {
      name.setValue(familiar.name);
      description.setValue(familiar.description);
    }

    return new ModalBuilder()
      .setCustomId(
        CharacterCustomIds.build(CharacterPanelAction.FamiliarModal, discordId, character.id),
      )
      .setTitle(`Фамильяр · ${character.rpName}`.slice(0, 45))
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Имя фамильяра")
          .setDescription("Например: сова Хедвиг")
          .setTextInputComponent(name),
        new LabelBuilder()
          .setLabel("Описание")
          .setDescription("Внешность, характер, история")
          .setTextInputComponent(description),
        new LabelBuilder()
          .setLabel("Изображение")
          .setDescription(
            familiar
              ? "Загрузите новое изображение или оставьте пустым, чтобы не менять"
              : "Загрузите изображение фамильяра",
          )
          .setFileUploadComponent(
            new FileUploadBuilder()
              .setCustomId(CharacterModalFields.FamiliarImage)
              .setRequired(!familiar),
          ),
      );
  }

  public static confirm(
    action: ManageCharacterAction,
    discordId: string,
    characterId: string,
  ) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(
          CharacterCustomIds.build(
            CharacterPanelAction.Confirm,
            action,
            discordId,
            characterId,
          ),
        )
        .setLabel("Подтвердить")
        .setEmoji("<:766839verifiedgreen:1518587368636944534>")
        .setStyle(ButtonStyle.Danger),
      this.characterButton(discordId, characterId, ACTION_TABS[action] ?? CharacterTab.Profile, "Отмена"),
    );
  }

  public static characterRow(discordId: string, characterId: string, tab: CharacterTab) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      this.characterButton(discordId, characterId, tab),
    );
  }

  public static playerRow(discordId: string) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      this.playerButton(discordId),
      ManageComponents.homeButton(),
    );
  }

  private static characterButton(
    discordId: string,
    characterId: string,
    tab: CharacterTab,
    label = "К персонажу",
  ) {
    return new ButtonBuilder()
      .setCustomId(CharacterCustomIds.build(CharacterPanelAction.Character, discordId, characterId, tab))
      .setLabel(label)
      .setEmoji("<:26204blackarrow:1518587278467792997>")
      .setStyle(ButtonStyle.Secondary);
  }

  private static playerButton(discordId: string, label = "К игроку") {
    return new ButtonBuilder()
      .setCustomId(CharacterCustomIds.build(CharacterPanelAction.Player, discordId))
      .setLabel(label)
      .setEmoji("<:26204blackarrow:1518587278467792997>")
      .setStyle(ButtonStyle.Secondary);
  }

  public static createModal(discordId: string, memberName: string) {
    return this.characterModal(
      CharacterCustomIds.build(CharacterPanelAction.CreateModal, discordId),
      `Новый персонаж · ${memberName}`,
      null,
    );
  }

  public static editModal(discordId: string, character: Character) {
    return this.characterModal(
      CharacterCustomIds.build(CharacterPanelAction.EditModal, discordId, character.id),
      `Изменить · ${character.rpName}`,
      character,
    );
  }

  private static characterModal(customId: string, title: string, character: Character | null) {
    const faculty = new StringSelectMenuBuilder()
      .setCustomId(CharacterModalFields.Faculty)
      .setPlaceholder("Выберите факультет")
      .setRequired(true)
      .addOptions(
        FACULTY_ORDER.map((item) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(CharacterFormatter.facultyLabel(item))
            .setValue(item)
            .setEmoji(CharacterFormatter.facultyEmoji(item))
            .setDefault(character?.faculty === item),
        ),
      );

    const name = new TextInputBuilder()
      .setCustomId(CharacterModalFields.Name)
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(2)
      .setMaxLength(80);

    const age = new TextInputBuilder()
      .setCustomId(CharacterModalFields.Age)
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(4);

    const specialRole = new TextInputBuilder()
      .setCustomId(CharacterModalFields.SpecialRole)
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(60);

    if (character) {
      name.setValue(character.rpName);

      if (character.specialRole) {
        specialRole.setValue(character.specialRole);
      }

      if (character.age !== null) {
        age.setValue(String(character.age));
      }
    }

    return new ModalBuilder()
      .setCustomId(customId)
      .setTitle(title.slice(0, 45))
      .addLabelComponents(
        new LabelBuilder().setLabel("Имя персонажа").setTextInputComponent(name),
        new LabelBuilder()
          .setLabel("Возраст, лет")
          .setDescription("Можно оставить пустым")
          .setTextInputComponent(age),
        new LabelBuilder()
          .setLabel("Особая роль")
          .setDescription("Например: профессор зельеварения. Можно оставить пустым")
          .setTextInputComponent(specialRole),
        new LabelBuilder()
          .setLabel("Аватар персонажа")
          .setDescription(
            character
              ? "Загрузите новое изображение или оставьте пустым, чтобы не менять"
              : "Загрузите изображение персонажа",
          )
          .setFileUploadComponent(
            new FileUploadBuilder()
              .setCustomId(CharacterModalFields.Avatar)
              .setRequired(false),
          ),
        new LabelBuilder()
          .setLabel("Факультет")
          .setStringSelectMenuComponent(faculty),
      );
  }

  public static itemSelect(
    discordId: string,
    characterId: string,
    items: InventoryListItem[],
  ) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(
          CharacterCustomIds.build(
            CharacterPanelAction.TakeSelect,
            discordId,
            characterId,
          ),
        )
        .setPlaceholder("Выберите предмет")
        .addOptions(
          items.slice(0, 25).map((item) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(item.name.slice(0, 100))
              .setDescription(`В наличии: ${item.quantity} шт.`)
              .setValue(item.id),
          ),
        ),
    );
  }

  public static giveItemModal(
    discordId: string,
    characterId: string,
    characterName: string,
  ) {
    return new ModalBuilder()
      .setCustomId(
        CharacterCustomIds.build(
          CharacterPanelAction.GiveModal,
          discordId,
          characterId,
        ),
      )
      .setTitle(`Предмет для ${characterName}`.slice(0, 45))
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Название предмета")
          .setDescription("Если предмет с таким названием уже есть, количество сложится")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(CharacterModalFields.ItemName)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(80)
              .setPlaceholder("Волшебная палочка"),
          ),
        new LabelBuilder()
          .setLabel("Количество")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(CharacterModalFields.ItemQuantity)
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setMaxLength(5)
              .setPlaceholder("1"),
          ),
        new LabelBuilder()
          .setLabel("Фото предмета")
          .setDescription("PNG, JPG, GIF или WEBP до 4 МБ")
          .setFileUploadComponent(
            new FileUploadBuilder()
              .setCustomId(CharacterModalFields.ItemImage)
              .setRequired(false),
          ),
      );
  }

  public static takeItemModal(
    discordId: string,
    characterId: string,
    item: InventoryListItem,
  ) {
    return new ModalBuilder()
      .setCustomId(
        CharacterCustomIds.build(
          CharacterPanelAction.TakeModal,
          discordId,
          characterId,
          item.id,
        ),
      )
      .setTitle(`Забрать: ${item.name}`.slice(0, 45))
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Количество")
          .setDescription(`В наличии: ${item.quantity} шт.`)
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(CharacterModalFields.ItemQuantity)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(5)
              .setValue(String(item.quantity)),
          ),
      );
  }

  public static manaModal(discordId: string, character: Character) {
    return new ModalBuilder()
      .setCustomId(
        CharacterCustomIds.build(
          CharacterPanelAction.ManaModal,
          discordId,
          character.id,
        ),
      )
      .setTitle(`Мана · ${character.rpName}`.slice(0, 45))
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Текущая мана")
          .setDescription("Может быть отрицательной, но не больше максимальной")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(CharacterModalFields.ManaCurrent)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(6)
              .setValue(String(Mana.current(character))),
          ),
        new LabelBuilder()
          .setLabel("Максимальная мана")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(CharacterModalFields.ManaMax)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(5)
              .setValue(String(character.maxMana)),
          ),
      );
  }

  public static balanceModal(discordId: string, character: Character) {
    const balance = Currency.fromKnuts(character.balanceKnuts);

    const amount = (customId: string, label: string, value: number, description?: string) => {
      const field = new LabelBuilder()
        .setLabel(label)
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(customId)
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(9)
            .setValue(String(value)),
        );

      return description ? field.setDescription(description) : field;
    };

    return new ModalBuilder()
      .setCustomId(
        CharacterCustomIds.build(CharacterPanelAction.BalanceModal, discordId, character.id),
      )
      .setTitle(`Баланс · ${character.rpName}`.slice(0, 45))
      .addLabelComponents(
        amount(
          CharacterModalFields.Galleons,
          "Галлеоны",
          balance.galleons,
          "Новый баланс целиком. 1 галлеон = 17 сиклей, 1 сикль = 29 кнатов",
        ),
        amount(CharacterModalFields.Sickles, "Сикли", balance.sickles),
        amount(CharacterModalFields.Knuts, "Кнаты", balance.knuts),
        new LabelBuilder()
          .setLabel("Причина")
          .setDescription("Попадёт в историю операций персонажа")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(CharacterModalFields.Reason)
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setMaxLength(200),
          ),
      );
  }
}
