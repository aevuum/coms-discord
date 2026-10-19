import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { MessageFlags, type ButtonInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import {
  ReportAdminAction,
  ReportAdminContainer,
  ReportAdminCustomIds,
} from "../lib/reportAdminContainer.js";
import { ReportReviewers } from "../service/reportReviewers.js";

type AdminButton = {
  action: ReportAdminAction;
  page: number;
};

export class ReportAdminButtonHandler extends InteractionHandler {
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
    const parsed = ReportAdminCustomIds.parse(interaction.customId);

    if (parsed?.action !== ReportAdminAction.Page && parsed?.action !== ReportAdminAction.Clear) {
      return this.none();
    }

    return this.some<AdminButton>(parsed);
  }

  public override async run(interaction: ButtonInteraction, result: AdminButton) {
    try {
      await interaction.deferUpdate();

      const guildId = await ReportReviewers.assertCanManage(interaction);

      if (result.action === ReportAdminAction.Clear) {
        await ReportReviewers.clear(guildId);
      }

      const view = await ReportReviewers.getView(guildId, result.page);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [ReportAdminContainer.root(view.roleIds, view.rolePage, view.roleNames)],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
