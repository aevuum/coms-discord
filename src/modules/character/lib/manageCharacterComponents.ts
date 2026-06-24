import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  UserSelectMenuBuilder,
} from "discord.js";
import { ManageCharacterAction } from "../types/character.js";

export class ManageCharacterComponents {
  public static createActions() {
    const row = new ActionRowBuilder<ButtonBuilder>();

    row.addComponents(
      new ButtonBuilder()
        .setCustomId("manage_character_create")
        .setLabel("Создать")
        .setStyle(ButtonStyle.Success)
        .setEmoji("<:6509addguild:1518587247769817088>"),

      new ButtonBuilder()
        .setCustomId("manage_character_delete")
        .setLabel("Удалить")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("<:14605delete:1518587266505642074>"),

      new ButtonBuilder()
        .setCustomId("manage_character_freeze")
        .setLabel("Заморозить")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:97970trialmoderator:1518587338513715260>"),

      new ButtonBuilder()
        .setCustomId("manage_character_unfreeze")
        .setLabel("Разморозить")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("<:172841lastmeadowbadge:1518587343378976779>"),

      new ButtonBuilder()
        .setCustomId("manage_character_kill")
        .setLabel("Умертвить")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("<:633509a:1518587362513256458>"),
    );

    return row;
  }

  public static createUserSelect(action: ManageCharacterAction) {
    return new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId(`manage_character_user_${action}`)
        .setPlaceholder("Выберите участника"),
    );
  }

  public static createCharacterSelect(
    action: ManageCharacterAction,
    userId: string,
    characters: {
      id: string;
      rpName: string;
    }[],
  ) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`manage_character_select_${action}_${userId}`)
      .setPlaceholder("Выберите персонажа");

    menu.addOptions(
      characters.map((character) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(character.rpName)
          .setValue(character.id),
      ),
    );

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  }

  public static createBack() {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("manage_character_back")
        .setLabel("Назад")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("<:26204blackarrow:1518587278467792997>"),
    );
  }
}
