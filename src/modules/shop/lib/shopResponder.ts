import { container } from "@sapphire/framework";

import {
  ChatInputCommandInteraction,
  MessageComponentInteraction,
  MessageFlags,
} from "discord.js";

import { ShopError } from "../types/shop.js";
import { ShopContainer } from "./shopContainer.js";

export class ShopResponder {
  public static async error(
    interaction: ChatInputCommandInteraction | MessageComponentInteraction,
    error: unknown,
  ) {
    let message = "Произошла непредвиденная ошибка. Попробуйте позже.";

    if (error instanceof ShopError) {
      message = error.message;
    } else {
      container.logger.error(error);
    }

    try {
      if (interaction.isMessageComponent() && !interaction.replied && !interaction.deferred) {
        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [ShopContainer.error(message)],
        });

        return;
      }

      const payload = {
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] as const,
        components: [ShopContainer.error(message)],
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload);
      } else {
        await interaction.reply(payload);
      }
    } catch (replyError) {
      container.logger.error(replyError);
    }
  }
}
