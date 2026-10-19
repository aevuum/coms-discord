import { container } from "@sapphire/framework";
import {
  MessageFlags,
  type ButtonInteraction,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";

import { SuggestionError } from "../types/suggestion.js";
import { SuggestionContainer } from "./suggestionContainer.js";

export class SuggestionResponder {
  public static async error(
    interaction: ButtonInteraction | StringSelectMenuInteraction | ModalSubmitInteraction,
    error: unknown,
  ) {
    if (!(error instanceof SuggestionError)) {
      container.logger.error(error);
    }

    const payload = {
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [
        SuggestionContainer.error(
          error instanceof SuggestionError ? error.message : "Произошла непредвиденная ошибка. Попробуйте позже.",
        ),
      ],
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => null);
      return;
    }

    await interaction.reply(payload).catch(() => null);
  }
}
