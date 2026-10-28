import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { PointsAction, PointsAdminContainer } from "../lib/pointsAdminContainer.js";
import { PointsAdminViews } from "../lib/pointsAdminViews.js";
import { PointsRepository } from "../repositories/pointsRepository.js";
import { PointsService } from "../service/pointsService.js";

const BUTTON_ACTIONS = new Set<PointsAction>([
  PointsAction.Root,
  PointsAction.Adjust,
  PointsAction.Channel,
  PointsAction.Reset,
  PointsAction.ResetConfirm,
]);

export class PointsAdminButtonHandler extends InteractionHandler {
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
    const action = PointsAdminContainer.parse(interaction.customId);

    return action && BUTTON_ACTIONS.has(action) ? this.some(action) : this.none();
  }

  public override async run(interaction: ButtonInteraction, action: PointsAction) {
    try {
      const guildId = await PointsService.assertCanManage(interaction);

      switch (action) {
        case PointsAction.Adjust:
          await interaction.showModal(PointsAdminContainer.adjustModal());
          return;

        case PointsAction.Channel:
          await interaction.showModal(
            PointsAdminContainer.channelModal((await PointsRepository.settings(guildId))?.channelId ?? null, interaction.inGuild()),
          );
          return;

        case PointsAction.Reset:
          await interaction.update({ flags: MessageFlags.IsComponentsV2, components: [PointsAdminContainer.resetConfirm()] });
          return;

        case PointsAction.ResetConfirm:
          await interaction.deferUpdate();
          await PointsService.reset();
          await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: [await PointsAdminViews.root(guildId, "Очки всех факультетов обнулены.")],
          });
          return;

        default:
          await interaction.deferUpdate();
          await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [await PointsAdminViews.root(guildId)] });
      }
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
