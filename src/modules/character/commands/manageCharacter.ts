import { ApplicationCommandRegistry, Command } from "@sapphire/framework";
import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { ManageCharacterContainer } from "../lib/manageCharacterContainer.js";

export class ManageCharacterCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "manage-character",
      description: "Управление персонажами",
      preconditions: ["RaceRoller"],
    });
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry,
  ) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("manage-character")
        .setDescription("Управление персонажами игроков"),
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.reply({
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      components: [ManageCharacterContainer.build("main")],
    });
  }
}
