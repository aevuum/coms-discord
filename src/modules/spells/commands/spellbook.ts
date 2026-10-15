import { ApplicationCommandRegistry, Command } from "@sapphire/framework";

import { ChatInputCommandInteraction, MessageFlags } from "discord.js";

import { SpellService } from "../service/spellService.js";
import { SpellContainer } from "../lib/spellContainer.js";
import { SpellResponder } from "../lib/spellResponder.js";
import { SpellMode } from "../types/spells.js";

export class SpellbookCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "spellbook",
      description: "Книга заклинаний",
    });
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry,
  ) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("spellbook")
        .setDescription("Открыть книгу заклинаний и их стоимость в мане"),
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    try {
      const page = await SpellService.getPage(0);

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [SpellContainer.page(page, SpellMode.View)],
      });
    } catch (error) {
      await SpellResponder.error(interaction, error);
    }
  }
}
