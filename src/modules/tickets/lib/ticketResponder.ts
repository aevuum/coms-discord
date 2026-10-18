import { container } from "@sapphire/framework";
import {
  MessageFlags,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
} from "discord.js";

import { TicketError } from "../types/ticket.js";
import { TicketContainer } from "./ticketContainer.js";

export class TicketResponder {
  public static async error(
    interaction: ButtonInteraction | StringSelectMenuInteraction,
    error: unknown,
  ) {
    if (!(error instanceof TicketError)) {
      container.logger.error(error);
    }

    const message =
      error instanceof TicketError
        ? error.message
        : "Произошла непредвиденная ошибка. Попробуйте позже.";

    const payload = {
      flags: MessageFlags.IsComponentsV2 as const,
      components: [TicketContainer.error(message)],
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
