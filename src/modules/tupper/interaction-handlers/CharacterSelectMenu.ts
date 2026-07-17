import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { StringSelectMenuInteraction, MessageFlags } from "discord.js";

import { CharacterService } from "../../character/service/characterService.js";
import { TupperComponents } from "../lib/tupperComponents.js";

export class CharacterSelectMenu extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.SelectMenu,
    });
  }

  public override parse(interaction: StringSelectMenuInteraction) {
    if (interaction.customId !== "tupper_select_character") {
      return this.none();
    }

    return this.some();
  }

  public override async run(interaction: StringSelectMenuInteraction) {
    const character = await CharacterService.getCharacterById(
      interaction.values[0],
    );

    if (!character) {
      return interaction.reply({
        content: "Персонаж не найден.",
        flags: MessageFlags.Ephemeral,
      });
    }

    if (character.user.discordId !== interaction.user.id) {
      return interaction.reply({
        content: "Это не ваш персонаж.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.update({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,

      components: TupperComponents.createSettings(character),
    });
  }
}
