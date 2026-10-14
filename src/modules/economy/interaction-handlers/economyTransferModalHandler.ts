import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, ModalSubmitInteraction } from "discord.js";

import {
  EconomyAction,
  EconomyCustomIds,
  TransferModalFields,
} from "../lib/economyCustomIds.js";
import { EconomyContainer } from "../lib/economyContainer.js";
import { EconomyResponder } from "../lib/economyResponder.js";
import { EconomyService } from "../services/economyService.js";

export class EconomyTransferModalHandler extends InteractionHandler {
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
    const parsed = EconomyCustomIds.parse(interaction.customId);

    if (!parsed || parsed.action !== EconomyAction.TransferModal) {
      return this.none();
    }

    return this.some({
      senderId: parsed.args[0],
      receiverId: parsed.args[1],
    });
  }

  public override async run(
    interaction: ModalSubmitInteraction,
    result: {
      senderId: string;
      receiverId: string;
    },
  ) {
    try {
      const amount = EconomyService.parseAmount(
        interaction.fields.getTextInputValue(TransferModalFields.Galleons),
        interaction.fields.getTextInputValue(TransferModalFields.Sickles),
        interaction.fields.getTextInputValue(TransferModalFields.Knuts),
      );

      const preview = await EconomyService.previewTransfer(
        interaction.user.id,
        result.senderId,
        result.receiverId,
        amount,
      );

      const components = [EconomyContainer.transferConfirm(preview)];

      if (interaction.isFromMessage()) {
        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components,
        });

        return;
      }

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components,
      });
    } catch (error) {
      await EconomyResponder.error(interaction, error, result.senderId);
    }
  }
}
