import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags } from "discord.js";

import { TupperService } from "../service/tupperService.js";
import { TupperComponents } from "../lib/tupperComponents.js";
import { TupperAction, TupperCustomIds } from "../lib/tupperCustomIds.js";
import { TupperResponder } from "../lib/tupperResponder.js";

const BUTTON_ACTIONS = new Set<TupperAction>([
  TupperAction.Back,
  TupperAction.Open,
  TupperAction.Name,
  TupperAction.Prefix,
]);

export class TupperButton extends InteractionHandler {
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
    const parsed = TupperCustomIds.parse(interaction.customId);

    if (!parsed || !BUTTON_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ButtonInteraction,
    result: {
      action: TupperAction;
      args: string[];
    },
  ) {
    try {
      if (result.action === TupperAction.Back) {
        const characters = await TupperService.getCharacters(
          interaction.user.id,
        );

        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [TupperComponents.selection(characters)],
        });

        return;
      }

      const character = await TupperService.getOwnedCharacter(
        interaction.user.id,
        result.args[0],
      );

      if (result.action === TupperAction.Open) {
        await interaction.reply({
          flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
          components: [TupperComponents.settings(character, false)],
        });

        return;
      }

      await interaction.showModal(
        result.action === TupperAction.Name
          ? TupperComponents.nameModal(character)
          : TupperComponents.prefixModal(character),
      );
    } catch (error) {
      await TupperResponder.error(interaction, error);
    }
  }
}
