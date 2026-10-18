import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { MessageFlags, type StringSelectMenuInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { RollAdminViews } from "../lib/rollAdminViews.js";
import { RollAdminAction, RollCustomIds } from "../lib/rollCustomIds.js";
import { RollService } from "../service/rollService.js";

export class RollAdminSelectHandler extends InteractionHandler {
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
    const parsed = RollCustomIds.parseAdmin(interaction.customId);

    if (parsed?.action !== RollAdminAction.View) {
      return this.none();
    }

    return this.some(interaction.values[0]);
  }

  public override async run(interaction: StringSelectMenuInteraction, id: string) {
    try {
      await interaction.deferUpdate();

      await RollService.assertCanManage(interaction);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [await RollAdminViews.view(id)],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
