import { ApplicationCommandRegistry, Command } from "@sapphire/framework";

import {
  ChatInputCommandInteraction,
  InteractionContextType,
  MessageFlags,
  PermissionFlagsBits,
} from "discord.js";

import { PermissionService } from "../service/permissionService.js";
import { PermissionContainer } from "../lib/permissionContainer.js";
import { PermissionResponder } from "../lib/permissionResponder.js";
import { CommandAccess } from "../types/permissions.js";

export class PermissionsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "permissions",
      description: "Настройка доступа ролей к командам",
      access: CommandAccess.Admin,
    });
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry,
  ) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("permissions")
        .setDescription("Настроить, каким ролям доступны команды бота")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setContexts(InteractionContextType.Guild),
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    try {
      PermissionService.assertAdmin(interaction);

      const commands = await PermissionService.listCommands(
        interaction.guildId as string,
      );

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [PermissionContainer.overview(commands)],
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      await PermissionResponder.error(interaction, error);
    }
  }
}
