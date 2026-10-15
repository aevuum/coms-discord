import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags } from "discord.js";

import { ManageAction, ManageCustomIds } from "../lib/manageCustomIds.js";
import { ManageResponder } from "../lib/manageResponder.js";
import { ManageService } from "../service/manageService.js";

export class ManageButtonHandler extends InteractionHandler {
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
    const parsed = ManageCustomIds.parse(interaction.customId);

    if (!parsed || parsed.action !== ManageAction.Home) {
      return this.none();
    }

    return this.some();
  }

  public override async run(interaction: ButtonInteraction) {
    try {
      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [await ManageService.getHub(interaction)],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
