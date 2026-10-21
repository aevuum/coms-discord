import { ApplicationCommandRegistry, Command } from "@sapphire/framework";

import { ChatInputCommandInteraction, MessageFlags } from "discord.js";

import { RuneResponder } from "../lib/runeResponder.js";
import { RuneView } from "../lib/runeView.js";

export class RuneCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "rune",
      description: "Изученные персонажем руны",
    });
  }

  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("rune").setDescription("Посмотреть руны, изученные персонажем"),
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [await RuneView.start(interaction.user.id)],
      });
    } catch (error) {
      await RuneResponder.error(interaction, error);
    }
  }
}
