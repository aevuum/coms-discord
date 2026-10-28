import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, ModalSubmitInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { ChannelField, SETTINGS_CHANNEL_TYPES } from "../../schedule/lib/channelField.js";
import { PointsAction, PointsAdminContainer, PointsFields } from "../lib/pointsAdminContainer.js";
import { PointsAdminViews } from "../lib/pointsAdminViews.js";
import { PointsBoard } from "../service/pointsBoard.js";
import { PointsService } from "../service/pointsService.js";
import { HOUSE_LABELS, HOUSES, PointsError, type House } from "../types/points.js";

export class PointsAdminModalHandler extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
    });
  }

  public override parse(interaction: ModalSubmitInteraction) {
    const action = PointsAdminContainer.parse(interaction.customId);

    return action === PointsAction.AdjustModal || action === PointsAction.ChannelModal ? this.some(action) : this.none();
  }

  public override async run(interaction: ModalSubmitInteraction, action: PointsAction) {
    try {
      await ManageResponder.defer(interaction);

      const guildId = await PointsService.assertCanManage(interaction);
      let notice: string;

      if (action === PointsAction.AdjustModal) {
        const faculty = interaction.fields.getStringSelectValues(PointsFields.House)[0] as House;

        if (!HOUSES.includes(faculty)) {
          throw new PointsError("Выберите факультет.");
        }

        const delta = await PointsService.adjust(
          guildId,
          interaction.user.id,
          faculty,
          interaction.fields.getTextInputValue(PointsFields.Amount),
          interaction.fields.getTextInputValue(PointsFields.Note),
        );

        notice = `${HOUSE_LABELS[faculty]}: ${delta > 0 ? "+" : ""}${delta} очков.`;
      } else {
        const channelId = ChannelField.read(interaction, PointsFields.Channel, guildId, SETTINGS_CHANNEL_TYPES);

        await PointsBoard.setChannel(interaction.client, guildId, channelId);
        notice = channelId ? `Часы опубликованы в <#${channelId}>.` : "Часы больше не публикуются.";
      }

      await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [await PointsAdminViews.root(guildId, notice)] });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
