import { ApplicationCommandRegistry, Command } from "@sapphire/framework";

import {
  ChatInputCommandInteraction,
  DiscordAPIError,
  InteractionContextType,
  MessageFlags,
  RESTJSONErrorCodes,
} from "discord.js";

import { CommandAccess } from "../../permissions/types/permissions.js";
import { ManageContainer } from "../lib/manageContainer.js";
import { ManageResponder } from "../lib/manageResponder.js";
import { ManageService } from "../service/manageService.js";

export class ManageCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "manage",
      description: "Панель управления ботом",
      access: CommandAccess.Delegated,
      fullCategory: ["admin"],
    });
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry,
  ) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("manage")
        .setDescription("Открыть панель управления ботом в личных сообщениях")
        .setContexts(InteractionContextType.Guild),
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const hub = await ManageService.getHub(interaction);

      const message = await interaction.user.send({
        flags: MessageFlags.IsComponentsV2,
        components: [hub],
      });

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          ManageContainer.notice(
            "<:312537mark:1518581040548024430> Панель отправлена",
            `Панель управления отправлена вам в [личные сообщения](${message.url}).`,
          ),
        ],
      });
    } catch (error) {
      if (
        error instanceof DiscordAPIError &&
        error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser
      ) {
        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            ManageContainer.notice(
              "<:240191mark:1518581039172292688> Ошибка",
              "Не удалось отправить личное сообщение. Разрешите личные сообщения от участников сервера и попробуйте снова.",
            ),
          ],
        });

        return;
      }

      await ManageResponder.error(interaction, error);
    }
  }
}
