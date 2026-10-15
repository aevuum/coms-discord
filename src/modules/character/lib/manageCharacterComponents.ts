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
  type Character,
} from "../../../database/generated/prisma/client.js";

import { CharacterFormatter } from "../../economy/lib/characterFormatter.js";
import { ManageComponents } from "../../manage/lib/manageComponents.js";
import {
  ManageCharacterAction,
  type InventoryListItem,
} from "../types/character.js";
import {
  CharacterCustomIds,
  CharacterModalFields,
  CharacterPanelAction,
} from "./characterCustomIds.js";

const ACTION_BUTTONS: {
  action: ManageCharacterAction;
  label: string;
  emoji: string;
  style: ButtonStyle;
}[] = [
  {
    action: ManageCharacterAction.Create,
    label: "Создать",
    emoji: "<:6509addguild:1518587247769817088>",
    style: ButtonStyle.Success,
  },
  {
    action: ManageCharacterAction.Delete,
    label: "Удалить",
    emoji: "<:14605delete:1518587266505642074>",
    style: ButtonStyle.Danger,
  },
  {
    action: ManageCharacterAction.Freeze,
    label: "Заморозить",
    emoji: "<:97970trialmoderator:1518587338513715260>",
    style: ButtonStyle.Secondary,
  },
  {
    action: ManageCharacterAction.Unfreeze,
    label: "Разморозить",
    emoji: "<:172841lastmeadowbadge:1518587343378976779>",
    style: ButtonStyle.Primary,
  },
  {
    action: ManageCharacterAction.Kill,
    label: "Умертвить",
    emoji: "<:633509a:1518587362513256458>",
    style: ButtonStyle.Danger,
  },
];

const FACULTY_ORDER: CharacterFaculty[] = [
  CharacterFaculty.GRYFFINDOR,
  CharacterFaculty.SLYTHERIN,
  CharacterFaculty.HUFFLEPUFF,
  CharacterFaculty.RAVENCLAW,
  CharacterFaculty.ADULT,
];

export class ManageCharacterComponents {
  public static actions() {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      ACTION_BUTTONS.map((button) =>
        new ButtonBuilder()
          .setCustomId(
            CharacterCustomIds.build(CharacterPanelAction.Start, button.action),
          )
          .setLabel(button.label)
          .setEmoji(button.emoji)
          .setStyle(button.style),
      ),
    );
  }

  public static characterSelect(
    action: ManageCharacterAction,
    discordId: string,
    characters: Character[],
  ) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(
          CharacterCustomIds.build(CharacterPanelAction.Pick, action, discordId),
        )
        .setPlaceholder("Выберите персонажа")
        .addOptions(
          characters.slice(0, 25).map((character) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(character.rpName.slice(0, 100))
              .setDescription(
                `${CharacterFormatter.statusLabel(character.status)} · ${CharacterFormatter.facultyLabel(character.faculty)}`,
              )
              .setValue(character.id),
          ),
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

      this.backButton("Отмена"),
    );
  }

  public static backRow() {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      this.backButton(),
      ManageComponents.homeButton(),
    );
  }

  public static createModal(discordId: string, memberName: string) {
    const faculty = new StringSelectMenuBuilder()
      .setCustomId(CharacterModalFields.Faculty)
      .setPlaceholder("Выберите факультет")
      .setRequired(true)
      .addOptions(
        FACULTY_ORDER.map((item) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(CharacterFormatter.facultyLabel(item))
            .setValue(item)
            .setEmoji(CharacterFormatter.facultyEmoji(item)),
        ),
      );

    return new ModalBuilder()
      .setCustomId(
        CharacterCustomIds.build(CharacterPanelAction.CreateModal, discordId),
      )
      .setTitle(`Новый персонаж · ${memberName}`.slice(0, 45))
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Имя персонажа")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(CharacterModalFields.Name)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMinLength(2)
              .setMaxLength(80),
          ),
        new LabelBuilder()
          .setLabel("Аватар персонажа")
          .setDescription("Загрузите изображение персонажа")
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

  public static itemActions() {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(
          CharacterCustomIds.build(
            CharacterPanelAction.Start,
            ManageCharacterAction.GiveItem,
          ),
        )
        .setLabel("Выдать предмет")
        .setEmoji("<:527877discordlegendchest:1518587359136972930>")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(
          CharacterCustomIds.build(
            CharacterPanelAction.Start,
            ManageCharacterAction.TakeItem,
          ),
        )
        .setLabel("Забрать предмет")
        .setEmoji("<:12138cross:1518587259669053591>")
        .setStyle(ButtonStyle.Secondary),
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

  private static backButton(label = "Назад") {
    return new ButtonBuilder()
      .setCustomId(CharacterCustomIds.build(CharacterPanelAction.Root))
      .setLabel(label)
      .setEmoji("<:26204blackarrow:1518587278467792997>")
      .setStyle(ButtonStyle.Secondary);
  }
}
