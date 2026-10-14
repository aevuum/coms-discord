import { ApplicationCommandRegistry, Command } from "@sapphire/framework";

import { ChatInputCommandInteraction, MessageFlags } from "discord.js";

import { EconomyService } from "../services/economyService.js";
import { EconomyContainer } from "../lib/economyContainer.js";
import { EconomyResponder } from "../lib/economyResponder.js";

export class EconomyCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "economy",
      description: "Экономика персонажа",
    });
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry,
  ) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("economy").setDescription("Открыть экономику персонажа"),
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    try {
      const characters = await EconomyService.getOverview(interaction.user.id);

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [EconomyContainer.overview(characters)],
      });
    } catch (error) {
      await EconomyResponder.error(interaction, error);
    }
  }
}
