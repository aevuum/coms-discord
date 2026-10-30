import { container } from "@sapphire/framework";

import { ContainerBuilder, MessageFlags, TextDisplayBuilder, type RepliableInteraction } from "discord.js";

const USER_ERRORS = new Set(["HalloweenError", "PermissionError"]);

export class HalloweenResponder {
  public static async error(interaction: RepliableInteraction, error: unknown) {
    const known = error instanceof Error && USER_ERRORS.has(error.name);

    if (!known) {
      container.logger.error(error);
    }

    const components = [
      new ContainerBuilder()
        .setAccentColor(0x475b56)
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### <:240191mark:1518581039172292688> Ошибка\n${known ? (error as Error).message : "Произошла непредвиденная ошибка. Попробуйте позже."}`,
          ),
        ),
    ];

    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral, components }).catch(() => null);
      return;
    }

    await interaction.reply({ flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral, components }).catch(() => null);
  }
}
