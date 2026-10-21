import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, StringSelectMenuInteraction } from "discord.js";

import { RuneAction, RuneCustomIds } from "../lib/runeCustomIds.js";
import { RuneResponder } from "../lib/runeResponder.js";
import { RuneView } from "../lib/runeView.js";

export class RuneSelectHandler extends InteractionHandler {
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
    const parsed = RuneCustomIds.parse(interaction.customId);

    if (!parsed || parsed.action !== RuneAction.Pick) {
      return this.none();
    }

    return this.some(interaction.values[0]);
  }

  public override async run(interaction: StringSelectMenuInteraction, characterId: string) {
    try {
      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [await RuneView.character(interaction.user.id, characterId)],
      });
    } catch (error) {
      await RuneResponder.error(interaction, error);
    }
  }
}
