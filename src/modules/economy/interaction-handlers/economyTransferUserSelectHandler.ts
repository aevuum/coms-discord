import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, UserSelectMenuInteraction } from "discord.js";

import { EconomyAction, EconomyCustomIds } from "../lib/economyCustomIds.js";
import { EconomyComponents } from "../lib/economyComponents.js";
import { EconomyContainer } from "../lib/economyContainer.js";
import { EconomyResponder } from "../lib/economyResponder.js";
import { EconomyService } from "../services/economyService.js";

export class EconomyTransferUserSelectHandler extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.SelectMenu,
    });
  }

  public override parse(interaction: UserSelectMenuInteraction) {
    const parsed = EconomyCustomIds.parse(interaction.customId);

    if (!parsed || parsed.action !== EconomyAction.TransferUser) {
      return this.none();
    }

    return this.some({
      senderId: parsed.args[0],
      receiverDiscordId: interaction.values[0],
    });
  }

  public override async run(
    interaction: UserSelectMenuInteraction,
    result: {
      senderId: string;
      receiverDiscordId: string;
    },
  ) {
    try {
      const receivers = await EconomyService.getTransferReceivers(
        interaction.user.id,
        result.senderId,
        result.receiverDiscordId,
      );

      if (receivers.characters.length === 1) {
        await interaction.showModal(
          EconomyComponents.transferModal(
            receivers.sender.id,
            receivers.characters[0].id,
          ),
        );

        return;
      }

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [
          EconomyContainer.selectTransferCharacter(
            receivers.sender,
            receivers.receiverDiscordId,
            receivers.characters,
          ),
        ],
      });
    } catch (error) {
      await EconomyResponder.error(interaction, error, result.senderId);
    }
  }
}
