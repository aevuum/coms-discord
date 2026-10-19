import { ApplicationCommandRegistry, Command } from "@sapphire/framework";

import { MessageFlags, type ChatInputCommandInteraction } from "discord.js";

import { TermsContainer } from "../lib/termsContainer.js";
import { TermsService } from "../service/termsService.js";

export class TermsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "terms",
      description: "Условия использования, политика данных и согласие",
    });
  }

  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("terms")
        .setDescription("Условия использования, политика обработки данных и отзыв согласия"),
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      components: [TermsContainer.overview(await TermsService.acceptedAt(interaction.user.id))],
    });
  }
}
