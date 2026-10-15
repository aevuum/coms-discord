import { ApplicationCommandRegistry, Command } from "@sapphire/framework";

import { ChatInputCommandInteraction, MessageFlags } from "discord.js";

import { HelpService } from "../service/helpService.js";
import { HelpContainer } from "../lib/helpContainer.js";

export class HelpCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "help",
      description: "Список доступных команд",
    });
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry,
  ) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("help").setDescription("Показать список доступных команд"),
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    try {
      const mask = await HelpService.getAccessMask(interaction);

      const help = await HelpService.getPage(mask, 0);

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [HelpContainer.page(help)],
      });
    } catch (error) {
      this.container.logger.error(error);

      await interaction
        .reply({
          flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
          components: [
            HelpContainer.error("Не удалось загрузить список команд."),
          ],
        })
        .catch(() => {});
    }
  }
}
