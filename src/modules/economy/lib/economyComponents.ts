import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

import { EconomyCustomIds } from "./economyCustomIds.js";

export class EconomyComponents {
  public static characterSelect(
    characters: {
      id: string;
      rpName: string;
    }[],
  ) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(EconomyCustomIds.characterSelect())
      .setPlaceholder("Выберите персонажа")
      .addOptions(
        characters.map((character) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(character.rpName)
            .setValue(character.id),
        ),
      );

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  }

  public static transferUserSelect(
    users: {
      discordId: string;
      username: string;
      characters: {
        id: string;
        rpName: string;
      }[];
    }[],
    senderId: string,
  ) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(EconomyCustomIds.transferUser(senderId))
      .setPlaceholder("Выберите пользователя")
      .addOptions(
        users.map((user) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(user.username)
            .setDescription(`${user.characters.length} персонажей`)
            .setValue(user.discordId),
        ),
      );

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  }
  public static transferCharacterSelect(
    senderId: string,
    characters: {
      id: string;
      rpName: string;
    }[],
  ) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(EconomyCustomIds.transferCharacter(senderId))
      .setPlaceholder("Выберите персонажа получателя")
      .addOptions(
        characters.map((character) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(character.rpName)
            .setValue(character.id),
        ),
      );

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  }

  public static main(characterId: string) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(EconomyCustomIds.transfer(characterId))
        .setLabel("Передать")
        .setEmoji("<:766839verifiedgreen:1518587368636944534>")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(EconomyCustomIds.history(characterId))
        .setLabel("История")
        .setEmoji("<:988044dots:1518581053642772621>")
        .setStyle(ButtonStyle.Secondary),
    );
  }

  public static back() {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(EconomyCustomIds.back())
        .setLabel("Назад")
        .setEmoji("<:26204blackarrow:1518587278467792997>")
        .setStyle(ButtonStyle.Secondary),
    );
  }
}
