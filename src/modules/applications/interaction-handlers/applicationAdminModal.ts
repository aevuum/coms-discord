import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import type { ModalSubmitInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import {
  ApplicationAdminAction,
  ApplicationAdminCustomIds,
  ApplicationAdminFields,
} from "../lib/applicationAdminCustomIds.js";
import { ApplicationAdminViews } from "../lib/applicationAdminViews.js";
import { ApplicationAdminService } from "../service/applicationAdminService.js";

type AdminModal = {
  action: ApplicationAdminAction;
  args: string[];
};

export class ApplicationAdminModalHandler extends InteractionHandler {
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
    const parsed = ApplicationAdminCustomIds.parse(interaction.customId);

    if (
      parsed?.action !== ApplicationAdminAction.AddModal &&
      parsed?.action !== ApplicationAdminAction.EditModal
    ) {
      return this.none();
    }

    return this.some<AdminModal>(parsed);
  }

  public override async run(interaction: ModalSubmitInteraction, result: AdminModal) {
    const [tagId, rawIndex] = result.args;

    try {
      await ManageResponder.defer(interaction);

      await ApplicationAdminService.assertCanManage(interaction);

      const question = ApplicationAdminService.parse(
        interaction.fields.getTextInputValue(ApplicationAdminFields.Title),
        interaction.fields.getTextInputValue(ApplicationAdminFields.Hint),
        interaction.fields.getStringSelectValues(ApplicationAdminFields.Optional)?.at(0) === "optional",
      );

      const index =
        result.action === ApplicationAdminAction.AddModal
          ? await ApplicationAdminService.add(interaction.client, tagId, question)
          : Number(rawIndex);

      if (result.action === ApplicationAdminAction.EditModal) {
        await ApplicationAdminService.edit(interaction.client, tagId, index, question);
      }

      await ManageResponder.send(
        interaction,
        await ApplicationAdminViews.question(interaction.client, tagId, index),
      );
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
