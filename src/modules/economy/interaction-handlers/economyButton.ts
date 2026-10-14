import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags } from "discord.js";

import { EconomyAction, EconomyCustomIds } from "../lib/economyCustomIds.js";
import { EconomyContainer } from "../lib/economyContainer.js";
import { EconomyResponder } from "../lib/economyResponder.js";
import { EconomyService } from "../services/economyService.js";

const BUTTON_ACTIONS = new Set<EconomyAction>([
  EconomyAction.Main,
  EconomyAction.Back,
  EconomyAction.Transfer,
  EconomyAction.History,
  EconomyAction.TransferConfirm,
]);

export class EconomyButtonHandler extends InteractionHandler {
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
    const parsed = EconomyCustomIds.parse(interaction.customId);

    if (!parsed || !BUTTON_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ButtonInteraction,
    result: {
      action: EconomyAction;
      args: string[];
    },
  ) {
    const [characterId] = result.args;

    try {
      switch (result.action) {
        case EconomyAction.Back: {
          const characters = await EconomyService.getOverview(
            interaction.user.id,
          );

          await interaction.update({
            flags: MessageFlags.IsComponentsV2,
            components: [EconomyContainer.overview(characters)],
          });

          return;
        }

        case EconomyAction.Main: {
          const card = await EconomyService.getCharacterCard(
            interaction.user.id,
            characterId,
          );

          await interaction.update({
            flags: MessageFlags.IsComponentsV2,
            components: [EconomyContainer.main(card.character, card.hasMultiple)],
          });

          return;
        }

        case EconomyAction.Transfer: {
          const sender = await EconomyService.getTransferSender(
            interaction.user.id,
            characterId,
          );

          await interaction.update({
            flags: MessageFlags.IsComponentsV2,
            components: [EconomyContainer.selectTransferUser(sender)],
          });

          return;
        }

        case EconomyAction.History: {
          const history = await EconomyService.getHistory(
            interaction.user.id,
            characterId,
            Number(result.args[1] ?? 0),
          );

          await interaction.update({
            flags: MessageFlags.IsComponentsV2,
            components: [EconomyContainer.history(history)],
          });

          return;
        }

        case EconomyAction.TransferConfirm: {
          const [senderId, receiverId, amount] = result.args;

          const transfer = await EconomyService.transfer(
            interaction.user.id,
            senderId,
            receiverId,
            Number(amount),
          );

          await interaction.update({
            flags: MessageFlags.IsComponentsV2,
            components: [EconomyContainer.transferSuccess(transfer)],
          });

          return;
        }
      }
    } catch (error) {
      await EconomyResponder.error(interaction, error, characterId);
    }
  }
}
