import { container } from "@sapphire/framework";
import {
  MessageFlags,
  type ChatInputCommandInteraction,
  type MessageComponentInteraction,
} from "discord.js";

import { TravelContainer } from "./travelContainer.js";

const USER_ERRORS = new Set(["LocationError", "CharacterError", "PermissionError"]);

export class TravelResponder {
  public static async error(
    interaction: ChatInputCommandInteraction | MessageComponentInteraction,
    error: unknown,
  ) {
    const message =
      error instanceof Error && USER_ERRORS.has(error.name)
        ? error.message
        : "Произошла непредвиденная ошибка. Попробуйте позже.";

    if (!(error instanceof Error && USER_ERRORS.has(error.name))) {
      container.logger.error(error);
    }

    const components = [TravelContainer.error(message)];

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components });
        return;
      }

      if (interaction.isMessageComponent() && this.isEphemeral(interaction)) {
        await interaction.update({ flags: MessageFlags.IsComponentsV2, components });
        return;
      }

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components,
      });
    } catch (replyError) {
      container.logger.error(replyError);
    }
  }

  public static isEphemeral(interaction: MessageComponentInteraction) {
    return interaction.message.flags.has(MessageFlags.Ephemeral);
  }
}
