import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags } from "discord.js";

import { RuneAction, RuneCustomIds } from "../lib/runeCustomIds.js";
import { RuneResponder } from "../lib/runeResponder.js";
import { RuneView } from "../lib/runeView.js";

export class RuneButtonHandler extends InteractionHandler {
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
    const parsed = RuneCustomIds.parse(interaction.customId);

    if (!parsed || (parsed.action !== RuneAction.Page && parsed.action !== RuneAction.Back)) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ButtonInteraction,
    result: {
      action: RuneAction;
      args: string[];
    },
  ) {
    try {
      const container =
        result.action === RuneAction.Back
          ? await RuneView.start(interaction.user.id)
          : await RuneView.character(
              interaction.user.id,
              result.args[0],
              Number(result.args[1]) || 0,
            );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      await RuneResponder.error(interaction, error);
    }
  }
}
