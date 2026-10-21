import { container } from "@sapphire/framework";

import { MessageFlags, type RepliableInteraction } from "discord.js";

import { RuneError } from "../service/runeService.js";
import { RuneContainer } from "./runeContainer.js";

export class RuneResponder {
  public static async error(interaction: RepliableInteraction, error: unknown) {
    if (!(error instanceof RuneError)) {
      container.logger.error(error);
    }

    const payload = {
      flags: MessageFlags.IsComponentsV2 as const,
      components: [
        RuneContainer.notice(
          "<:240191mark:1518581039172292688> Ошибка",
          error instanceof RuneError
            ? error.message
            : "Произошла непредвиденная ошибка. Попробуйте позже.",
        ),
      ],
    };

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(payload).catch(() => null);
      return;
    }

    await interaction
      .reply({ ...payload, flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral })
      .catch(() => null);
  }
}
