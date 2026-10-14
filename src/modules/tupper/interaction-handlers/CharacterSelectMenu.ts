import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, StringSelectMenuInteraction } from "discord.js";

import { TupperService } from "../service/tupperService.js";
import { TupperComponents } from "../lib/tupperComponents.js";
import { TupperAction, TupperCustomIds } from "../lib/tupperCustomIds.js";
import { TupperResponder } from "../lib/tupperResponder.js";

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
    const parsed = TupperCustomIds.parse(interaction.customId);

    if (!parsed || parsed.action !== TupperAction.Select) {
      return this.none();
    }

    return this.some({
      characterId: interaction.values[0],
    });
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    result: {
      characterId: string;
    },
  ) {
    try {
      const character = await TupperService.getOwnedCharacter(
        interaction.user.id,
        result.characterId,
      );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [TupperComponents.settings(character, true)],
      });
    } catch (error) {
      await TupperResponder.error(interaction, error);
    }
  }
}
