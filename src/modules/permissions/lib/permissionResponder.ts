import { container } from "@sapphire/framework";

import {
  ChatInputCommandInteraction,
  MessageComponentInteraction,
  MessageFlags,
} from "discord.js";

import { PermissionError } from "../types/permissions.js";
import { PermissionContainer } from "./permissionContainer.js";

export class PermissionResponder {
  public static async error(
    interaction: ChatInputCommandInteraction | MessageComponentInteraction,
    error: unknown,
  ) {
    let message = "Произошла непредвиденная ошибка. Попробуйте позже.";

    if (error instanceof PermissionError) {
      message = error.message;
    } else {
      container.logger.error(error);
    }

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
          components: [PermissionContainer.error(message)],
        });

        return;
      }

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [PermissionContainer.error(message)],
      });
    } catch (replyError) {
      container.logger.error(replyError);
    }
  }
}
