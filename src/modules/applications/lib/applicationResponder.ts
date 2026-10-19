import { container } from "@sapphire/framework";
import {
  MessageFlags,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";

import { ApplicationError } from "../types/application.js";
import { ApplicationContainer } from "./applicationContainer.js";

export class ApplicationResponder {
  public static async error(
    interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction,
    error: unknown,
  ) {
    if (!(error instanceof ApplicationError)) {
      container.logger.error(error);
    }

    const message =
      error instanceof ApplicationError
        ? error.message
        : "Произошла непредвиденная ошибка. Попробуйте позже.";

    const payload = {
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [ApplicationContainer.error(message)],
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => null);
      return;
    }

    await interaction.reply(payload).catch(() => null);
  }
}
