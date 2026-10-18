import { container } from "@sapphire/framework";
import {
  MessageFlags,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
} from "discord.js";

import { ROLL_KINDS } from "./rollKinds.js";
import { RollContainer } from "./rollContainer.js";
import { RollService } from "../service/rollService.js";
import type { RollKind } from "../types/rolls.js";

export class RollResponder {
  public static async build(kind: RollKind) {
    const { entry, entries } = await RollService.roll(kind);

    return RollContainer.result(ROLL_KINDS[kind], entry, RollService.effectiveChance(entry, entries));
  }

  public static async error(
    interaction: ChatInputCommandInteraction | ButtonInteraction,
    error: unknown,
  ) {
    const userError = error instanceof Error && error.name === "RollError";

    if (!userError) {
      container.logger.error(error);
    }

    const payload = {
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] as const,
      components: [
        RollContainer.error(
          userError ? (error as Error).message : "Произошла непредвиденная ошибка. Попробуйте позже.",
        ),
      ],
    };

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload);
        return;
      }

      await interaction.reply(payload);
    } catch (replyError) {
      container.logger.error(replyError);
    }
  }
}
