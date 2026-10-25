import { container } from "@sapphire/framework";

import { MessageFlags, type RepliableInteraction } from "discord.js";

import { LessonCard } from "./lessonCard.js";

const USER_ERRORS = new Set(["ScheduleError", "PermissionError"]);

export class ScheduleResponder {
  public static async error(interaction: RepliableInteraction, error: unknown) {
    const known = error instanceof Error && USER_ERRORS.has(error.name);

    if (!known) {
      container.logger.error(error);
    }

    const components = [LessonCard.error(known ? (error as Error).message : "Произошла непредвиденная ошибка. Попробуйте позже.")];

    if (interaction.isChatInputCommand() && interaction.deferred) {
      await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components }).catch(() => null);
      return;
    }

    if (interaction.deferred || interaction.replied) {
      await interaction
        .followUp({ flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral, components })
        .catch(() => null);
      return;
    }

    await interaction
      .reply({ flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral, components })
      .catch(() => null);
  }
}
