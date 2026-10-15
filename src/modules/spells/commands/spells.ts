import { ApplicationCommandRegistry, Command } from "@sapphire/framework";

import { ChatInputCommandInteraction, MessageFlags } from "discord.js";

import { SpellService } from "../service/spellService.js";
import { SpellContainer } from "../lib/spellContainer.js";
import { SpellResponder } from "../lib/spellResponder.js";
import { SpellMode } from "../types/spells.js";
import { CommandAccess } from "../../permissions/types/permissions.js";

export class SpellsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "spells",
      description: "Управление заклинаниями",
      access: CommandAccess.Restricted,
      fullCategory: ["admin"],
    });
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry,
  ) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("spells")
        .setDescription("Создавать, изменять и удалять заклинания"),
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    try {
      const page = await SpellService.getPage(0);

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [SpellContainer.page(page, SpellMode.Manage)],
      });
    } catch (error) {
      await SpellResponder.error(interaction, error);
    }
  }
}
