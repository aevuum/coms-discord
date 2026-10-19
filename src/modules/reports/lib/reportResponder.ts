import { container } from "@sapphire/framework";
import {
  MessageFlags,
  type ButtonInteraction,
  type ModalSubmitInteraction,
} from "discord.js";

import { ReportError } from "../types/report.js";
import { ReportContainer } from "./reportContainer.js";

export class ReportResponder {
  public static async error(
    interaction: ButtonInteraction | ModalSubmitInteraction,
    error: unknown,
  ) {
    if (!(error instanceof ReportError)) {
      container.logger.error(error);
    }

    const message =
      error instanceof ReportError
        ? error.message
        : "Произошла непредвиденная ошибка. Попробуйте позже.";

    const payload = {
      flags: MessageFlags.IsComponentsV2 as const,
      components: [ReportContainer.error(message)],
    };

    if (interaction.deferred || interaction.replied) {
      await interaction
        .followUp({ ...payload, flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral })
        .catch(() => null);
      return;
    }

    await interaction
      .reply({ ...payload, flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral })
      .catch(() => null);
  }
}
