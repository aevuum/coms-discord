import { container } from "@sapphire/framework";

import {
  ChatInputCommandInteraction,
  MessageComponentInteraction,
  MessageFlags,
  ModalSubmitInteraction,
} from "discord.js";

import { EconomyError } from "../types/economy.js";
import { EconomyContainer } from "./economyContainer.js";

type EconomyInteraction =
  | ChatInputCommandInteraction
  | MessageComponentInteraction
  | ModalSubmitInteraction;

export class EconomyResponder {
  public static message(error: unknown) {
    if (error instanceof EconomyError) {
      return error.message;
    }

    container.logger.error(error);

    return "Произошла непредвиденная ошибка. Попробуйте позже.";
  }

  public static async error(
    interaction: EconomyInteraction,
    error: unknown,
    backCharacterId?: string,
  ) {
    const message = this.message(error);

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
          components: [EconomyContainer.error(message, undefined, false)],
        });

        return;
      }

      if (interaction.isMessageComponent()) {
        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [EconomyContainer.error(message, backCharacterId)],
        });

        return;
      }

      if (interaction.isModalSubmit() && interaction.isFromMessage()) {
        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [EconomyContainer.error(message, backCharacterId)],
        });

        return;
      }

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [EconomyContainer.error(message, undefined, false)],
      });
    } catch (replyError) {
      container.logger.error(replyError);
    }
  }
}
