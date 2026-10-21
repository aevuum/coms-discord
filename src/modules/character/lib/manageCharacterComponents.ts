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
} from "../../../database/generated/prisma/client.js";

import { CharacterFormatter } from "../../economy/lib/characterFormatter.js";
import { Currency } from "../../economy/lib/currency.js";
import { ManageComponents } from "../../manage/lib/manageComponents.js";
import { Mana } from "../../spells/lib/mana.js";
import {
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

  public static dashboardRows(discordId: string, character: Character) {
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

    const alive = character.status === CharacterStatus.ALIVE;

    return [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        act(ManageCharacterAction.Edit, "Изменить", "<:984149edit:1518587370474176612>", ButtonStyle.Primary),
        act(ManageCharacterAction.SetMana, "Мана", "<:29865potionwhite:1518587289989550100>", ButtonStyle.Secondary),
        act(ManageCharacterAction.SetBalance, "Баланс", "<:galleon:1521547045268099242>", ButtonStyle.Secondary),
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        act(ManageCharacterAction.GiveItem, "Выдать предмет", "<:527877discordlegendchest:1518587359136972930>", ButtonStyle.Success),
        act(ManageCharacterAction.TakeItem, "Забрать предмет", "<:12138cross:1518587259669053591>", ButtonStyle.Secondary),
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        alive
          ? act(ManageCharacterAction.Freeze, "Заморозить", "<:97970trialmoderator:1518587338513715260>", ButtonStyle.Secondary)
          : act(
              ManageCharacterAction.Unfreeze,
              character.status === CharacterStatus.DEAD ? "Вернуть к жизни" : "Разморозить",
              "<:172841lastmeadowbadge:1518587343378976779>",
              ButtonStyle.Primary,
            ),
        act(ManageCharacterAction.Kill, "Умертвить", "<:633509a:1518587362513256458>", ButtonStyle.Danger)
          .setDisabled(character.status === CharacterStatus.DEAD),
        act(ManageCharacterAction.Delete, "Удалить", "<:14605delete:1518587266505642074>", ButtonStyle.Danger),
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        this.playerButton(discordId, "Все персонажи игрока"),
        this.searchButton("Другой игрок").setStyle(ButtonStyle.Secondary),
        ManageComponents.homeButton(),
      ),
    ];
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
      this.characterButton(discordId, characterId, "Отмена"),
    );
  }

  public static characterRow(discordId: string, characterId: string) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      this.characterButton(discordId, characterId),
    );
  }

  public static playerRow(discordId: string) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      this.playerButton(discordId),
      ManageComponents.homeButton(),
    );
  }

  private static characterButton(discordId: string, characterId: string, label = "К персонажу") {
    return new ButtonBuilder()
      .setCustomId(CharacterCustomIds.build(CharacterPanelAction.Character, discordId, characterId))
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
