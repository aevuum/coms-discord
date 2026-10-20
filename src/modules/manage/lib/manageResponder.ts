import { container } from "@sapphire/framework";

import {
  ChatInputCommandInteraction,
  ContainerBuilder,
  MessageComponentInteraction,
  MessageFlags,
  ModalSubmitInteraction,
} from "discord.js";

import { ManageContainer } from "./manageContainer.js";

const USER_ERRORS = new Set([
  "ManageError",
  "PermissionError",
  "SpellError",
  "AwardError",
  "CharacterError",
  "ShopError",
  "CoinsError",
  "LocationError",
  "RollError",
  "ApplicationError",
  "ReportError",
  "GiveawayError",
  "PingRoleError",
  "SuggestionError",
  "StorageError",
]);

export class ManageError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ManageError";
  }
}

export class ManageResponder {
  public static message(error: unknown) {
    if (error instanceof Error && USER_ERRORS.has(error.name)) {
      return error.message;
    }

    container.logger.error(error);

    return "Произошла непредвиденная ошибка. Попробуйте позже.";
  }

  public static async error(
    interaction:
      | ChatInputCommandInteraction
      | MessageComponentInteraction
      | ModalSubmitInteraction,
    error: unknown,
  ) {
    const components = [ManageContainer.error(this.message(error))];

    try {
      if (interaction.deferred && !interaction.replied) {
        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components,
        });

        return;
      }

      if (interaction.replied) {
        await interaction.followUp({
          flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
          components,
        });

        return;
      }

      if (interaction.isMessageComponent()) {
        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components,
        });

        return;
      }

      if (interaction.isModalSubmit() && interaction.isFromMessage()) {
        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components,
        });

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

  public static async defer(interaction: ModalSubmitInteraction) {
    if (interaction.isFromMessage()) {
      await interaction.deferUpdate();
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  public static async send(
    interaction: ModalSubmitInteraction,
    container: ContainerBuilder,
  ) {
    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
  }
}
