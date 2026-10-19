import { ApplicationCommandRegistry, Command } from "@sapphire/framework";

import {
  ApplicationCommandType,
  type ChatInputCommandInteraction,
  type ContextMenuCommandInteraction,
} from "discord.js";

import { REPORT_CONTEXT_MENU_NAME } from "../lib/reportConfig.js";
import { ReportModal } from "../lib/reportModal.js";

export class ReportCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "report",
      description: "Пожаловаться на нарушение правил",
    });
  }

  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("report").setDescription("Пожаловаться администрации на нарушение правил"),
    );

    registry.registerContextMenuCommand((builder) =>
      builder.setName(REPORT_CONTEXT_MENU_NAME).setType(ApplicationCommandType.Message),
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.showModal(ReportModal.create(null));
  }

  public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
    if (!interaction.isMessageContextMenuCommand()) {
      return;
    }

    const message = interaction.targetMessage;

    const authorId =
      message.webhookId || message.author.bot || message.author.id === interaction.user.id
        ? null
        : message.author.id;

    await interaction.showModal(
      ReportModal.create({
        channelId: message.channelId,
        messageId: message.id,
        authorId,
      }),
    );
  }
}
