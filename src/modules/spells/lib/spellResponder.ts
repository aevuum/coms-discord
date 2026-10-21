import { container } from "@sapphire/framework";

import {
  ChatInputCommandInteraction,
  MessageComponentInteraction,
  MessageFlags,
  ModalSubmitInteraction,
} from "discord.js";

import { StorageError } from "../../../lib/storage.js";
import { SpellError } from "../types/spells.js";
import { SpellContainer } from "./spellContainer.js";

export class SpellResponder {
  public static async error(
    interaction:
      | ChatInputCommandInteraction
      | MessageComponentInteraction
      | ModalSubmitInteraction,
    error: unknown,
  ) {
    let message = "Произошла непредвиденная ошибка. Попробуйте позже.";

    if (error instanceof SpellError || error instanceof StorageError) {
      message = error.message;
    } else {
      container.logger.error(error);
    }

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
          components: [SpellContainer.error(message)],
        });

        return;
      }

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [SpellContainer.error(message)],
      });
    } catch (replyError) {
      container.logger.error(replyError);
    }
  }
}
