import { ApplicationCommandRegistry, Command } from "@sapphire/framework";

import type { ChatInputCommandInteraction } from "discord.js";

import { ActivityService } from "../service/activityService.js";

export class TopCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "top",
      description: "Самые активные игроки недели",
    });
  }

  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("top").setDescription("Самые активные игроки недели: сообщения и голосовые"),
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      await interaction.editReply(
        await ActivityService.getMessage(interaction.client, 0, interaction.user.id),
      );
    } catch (error) {
      this.container.logger.error(error);

      await interaction.editReply({ content: "Не удалось загрузить рейтинг. Попробуйте позже." });
    }
  }
}
