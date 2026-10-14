import { container } from "@sapphire/framework";

import {
  MessageComponentInteraction,
  MessageFlags,
  ModalSubmitInteraction,
} from "discord.js";

import { TupperError } from "../types/tupper.js";
import { TupperComponents } from "./tupperComponents.js";

export class TupperResponder {
  public static async error(
    interaction: MessageComponentInteraction | ModalSubmitInteraction,
    error: unknown,
  ) {
    let message = "Произошла непредвиденная ошибка. Попробуйте позже.";

    if (error instanceof TupperError) {
      message = error.message;
    } else {
      container.logger.error(error);
    }

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
          components: [TupperComponents.error(message)],
        });

        return;
      }

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [TupperComponents.error(message)],
      });
    } catch (replyError) {
      container.logger.error(replyError);
    }
  }
}
