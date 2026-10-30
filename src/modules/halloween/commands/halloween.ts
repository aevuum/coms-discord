import { ApplicationCommandRegistry, Command } from "@sapphire/framework";

import { ChatInputCommandInteraction, MessageFlags } from "discord.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { HalloweenResponder } from "../lib/halloweenResponder.js";
import { HalloweenViews } from "../lib/halloweenViews.js";
import { HalloweenError } from "../types/halloween.js";

export class HalloweenCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "halloween",
      description: "Конфеты, тыквы-артефакты и хэллоуинская лавка",
    });
  }

  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("halloween").setDescription("Ваши конфеты и тыквы, хэллоуинская лавка и обмен на комс-коины"),
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const subject = await PermissionService.resolveSubject(interaction);

      if (!subject.guildId) {
        throw new HalloweenError("Вы не состоите на сервере бота.");
      }

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        ...(await HalloweenViews.player(interaction.user.id, subject.guildId)),
      });
    } catch (error) {
      await HalloweenResponder.error(interaction, error);
    }
  }
}
