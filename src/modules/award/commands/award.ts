import { Command } from "@sapphire/framework";
import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  MessageComponentInteraction,
} from "discord.js";
import { AwardPanelBuilder } from "../lib/awardPanelBuilder.js";
import { AwardPanelController } from "../lib/awardPanelController.js";
import { IPanelSession } from "../types/award.js";

export class AwardCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "award",
      description: "Управление наградами через интерактивную панель",
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("award")
        .setDescription("Открыть панель наград")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const session: IPanelSession = { state: "MAIN" };
    const payload = await AwardPanelBuilder.build(session);

    await interaction.reply(payload);
    const message = await interaction.fetchReply();
    const collector = message.createMessageComponentCollector({ time: 600000 });

    collector.on("collect", async (i: MessageComponentInteraction) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: "<:240191mark:1518581039172292688> У вас нет доступа.",
          ephemeral: true,
        });
      }

      await AwardPanelController.handleInteraction(i, session);
    });
  }
}
