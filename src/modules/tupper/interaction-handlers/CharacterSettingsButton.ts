import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags } from "discord.js";

import { TupperService } from "../service/tupperService.js";
import { TupperComponents } from "../lib/tupperComponents.js";
import { TupperResponder } from "../lib/tupperResponder.js";

export class CharacterSettingsButton extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button,
    });
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith("character_settings_")) {
      return this.none();
    }

    return this.some();
  }

  public override async run(interaction: ButtonInteraction) {
    try {
      const characters = await TupperService.getCharacters(
        interaction.user.id,
      );

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [
          characters.length === 1
            ? TupperComponents.settings(characters[0], false)
            : TupperComponents.selection(characters),
        ],
      });
    } catch (error) {
      await TupperResponder.error(interaction, error);
    }
  }
}
