import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { MessageFlags, type StringSelectMenuInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { ApplicationAdminAction, ApplicationAdminCustomIds } from "../lib/applicationAdminCustomIds.js";
import { ApplicationAdminViews } from "../lib/applicationAdminViews.js";
import { ApplicationAdminService } from "../service/applicationAdminService.js";

type AdminSelect = {
  action: ApplicationAdminAction;
  args: string[];
};

export class ApplicationAdminSelectHandler extends InteractionHandler {
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
    const parsed = ApplicationAdminCustomIds.parse(interaction.customId);

    if (
      parsed?.action !== ApplicationAdminAction.PickRole &&
      parsed?.action !== ApplicationAdminAction.PickQuestion
    ) {
      return this.none();
    }

    return this.some<AdminSelect>(parsed);
  }

  public override async run(interaction: StringSelectMenuInteraction, result: AdminSelect) {
    try {
      await interaction.deferUpdate();

      await ApplicationAdminService.assertCanManage(interaction);

      const [value] = interaction.values;

      const view =
        result.action === ApplicationAdminAction.PickRole
          ? await ApplicationAdminViews.role(interaction.client, value)
          : await ApplicationAdminViews.question(interaction.client, result.args[0], Number(value));

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [view],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
