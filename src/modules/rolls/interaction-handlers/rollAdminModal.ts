import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import type { ModalSubmitInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { RollAdminViews } from "../lib/rollAdminViews.js";
import { RollAdminAction, RollCustomIds, RollModalFields } from "../lib/rollCustomIds.js";
import { RollService } from "../service/rollService.js";
import type { RollEntryInput } from "../types/rolls.js";

export class RollAdminModalHandler extends InteractionHandler {
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
    const parsed = RollCustomIds.parseAdmin(interaction.customId);

    if (
      parsed?.action !== RollAdminAction.CreateModal &&
      parsed?.action !== RollAdminAction.EditModal
    ) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ModalSubmitInteraction,
    result: { action: RollAdminAction; args: string[] },
  ) {
    try {
      await ManageResponder.defer(interaction);

      await RollService.assertCanManage(interaction);

      const input = this.input(interaction);

      if (result.action === RollAdminAction.CreateModal) {
        const meta = RollAdminViews.meta(result.args[0]);
        const entry = await RollService.create(interaction.client, meta.kind, input);

        await ManageResponder.send(interaction, await RollAdminViews.view(entry.id));
        return;
      }

      const entry = await RollService.update(interaction.client, result.args[0], input);

      await ManageResponder.send(interaction, await RollAdminViews.view(entry.id));
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }

  private input(interaction: ModalSubmitInteraction): RollEntryInput {
    const { fields } = interaction;

    const optional = (id: string) => {
      try {
        return fields.getTextInputValue(id);
      } catch {
        return null;
      }
    };

    return {
      name: fields.getTextInputValue(RollModalFields.Name),
      emoji: optional(RollModalFields.Emoji) ?? "",
      description: optional(RollModalFields.Description) ?? "",
      imageUrl: optional(RollModalFields.ImageUrl) ?? "",
      chance: optional(RollModalFields.Chance),
    };
  }
}
