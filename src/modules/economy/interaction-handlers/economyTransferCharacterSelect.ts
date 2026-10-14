import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { StringSelectMenuInteraction } from "discord.js";

import { EconomyAction, EconomyCustomIds } from "../lib/economyCustomIds.js";
import { EconomyComponents } from "../lib/economyComponents.js";
import { EconomyResponder } from "../lib/economyResponder.js";

export class EconomyTransferCharacterSelectHandler extends InteractionHandler {
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
    const parsed = EconomyCustomIds.parse(interaction.customId);

    if (!parsed || parsed.action !== EconomyAction.TransferCharacter) {
      return this.none();
    }

    return this.some({
      senderId: parsed.args[0],
      receiverId: interaction.values[0],
    });
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    result: {
      senderId: string;
      receiverId: string;
    },
  ) {
    try {
      await interaction.showModal(
        EconomyComponents.transferModal(result.senderId, result.receiverId),
      );
    } catch (error) {
      await EconomyResponder.error(interaction, error, result.senderId);
    }
  }
}
