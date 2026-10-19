import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import type { ModalSubmitInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { GiveawayAdminViews } from "../lib/giveawayAdminViews.js";
import { GiveawayAdminAction, GiveawayCustomIds, GiveawayModalFields } from "../lib/giveawayCustomIds.js";
import { GiveawayService } from "../service/giveawayService.js";

export class GiveawayAdminModalHandler extends InteractionHandler {
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
    const parsed = GiveawayCustomIds.parseAdmin(interaction.customId);

    return parsed?.action === GiveawayAdminAction.CreateModal ? this.some() : this.none();
  }

  public override async run(interaction: ModalSubmitInteraction) {
    try {
      await ManageResponder.defer(interaction);

      const guildId = await GiveawayService.assertCanManage(interaction);
      const { fields } = interaction;

      const giveaway = await GiveawayService.create(
        interaction.client,
        guildId,
        interaction.user.id,
        {
          prize: fields.getTextInputValue(GiveawayModalFields.Prize),
          description: fields.getTextInputValue(GiveawayModalFields.Description),
          winners: fields.getTextInputValue(GiveawayModalFields.Winners),
          duration: fields.getTextInputValue(GiveawayModalFields.Duration),
        },
        fields.getUploadedFiles(GiveawayModalFields.Image)?.first() ?? null,
      );

      await ManageResponder.send(interaction, await GiveawayAdminViews.view(guildId, giveaway.id));
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
