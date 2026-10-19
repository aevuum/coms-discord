import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { MessageFlags, type StringSelectMenuInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import {
  ReportAdminAction,
  ReportAdminContainer,
  ReportAdminCustomIds,
} from "../lib/reportAdminContainer.js";
import { ReportReviewers } from "../service/reportReviewers.js";

export class ReportAdminSelectHandler extends InteractionHandler {
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
    const parsed = ReportAdminCustomIds.parse(interaction.customId);

    if (parsed?.action !== ReportAdminAction.Roles) {
      return this.none();
    }

    return this.some(parsed.page);
  }

  public override async run(interaction: StringSelectMenuInteraction, page: number) {
    try {
      await interaction.deferUpdate();

      const guildId = await ReportReviewers.assertCanManage(interaction);

      await ReportReviewers.setOnPage(guildId, page, interaction.values);

      const view = await ReportReviewers.getView(guildId, page);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [ReportAdminContainer.root(view.roleIds, view.rolePage, view.roleNames)],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
