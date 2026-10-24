import { ApplicationCommandRegistry, Command } from "@sapphire/framework";

import { ChatInputCommandInteraction, MessageFlags } from "discord.js";

import { ArtifactView } from "../lib/artifactView.js";
import { RuneResponder } from "../lib/runeResponder.js";

export class ArtifactCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "artifact",
      description: "Артефакты персонажа и их создание",
    });
  }

  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("artifact").setDescription("Посмотреть и создать рунические артефакты персонажа"),
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [await ArtifactView.start(interaction.user.id)],
      });
    } catch (error) {
      await RuneResponder.error(interaction, error);
    }
  }
}
