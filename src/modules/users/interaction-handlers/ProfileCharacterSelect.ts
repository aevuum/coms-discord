import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import {
  DiscordAPIError,
  MessageFlags,
  RESTJSONErrorCodes,
  StringSelectMenuInteraction,
} from "discord.js";

import { CharacterCardContainer } from "../lib/characterCardContainer.js";
import { ProfileService } from "../service/profileService.js";
import { ProfileError } from "../types/profile.js";

const PREFIX = "profile_character_";

export class ProfileCharacterSelect extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.SelectMenu,
    });
  }

  public override parse(interaction: StringSelectMenuInteraction) {
    if (!interaction.customId.startsWith(PREFIX)) {
      return this.none();
    }

    return this.some({
      characterId: interaction.values[0],
    });
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    result: {
      characterId: string;
    },
  ) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const character = await ProfileService.getOwnedCharacter(
        interaction.user.id,
        result.characterId,
      );

      const message = await interaction.user.send({
        flags: MessageFlags.IsComponentsV2,
        components: [CharacterCardContainer.build(character)],
      });

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          CharacterCardContainer.notice(
            "<:312537mark:1518581040548024430> Карточка отправлена",
            `Карточка **${character.rpName}** отправлена вам в [личные сообщения](${message.url}).`,
          ),
        ],
      });
    } catch (error) {
      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          CharacterCardContainer.notice(
            "<:240191mark:1518581039172292688> Ошибка",
            this.describe(error),
          ),
        ],
      });
    }
  }

  private describe(error: unknown) {
    if (error instanceof ProfileError) {
      return error.message;
    }

    if (
      error instanceof DiscordAPIError &&
      error.code === RESTJSONErrorCodes.CannotSendMessagesToThisUser
    ) {
      return "Не удалось отправить личное сообщение. Разрешите личные сообщения от участников сервера в настройках приватности и попробуйте снова.";
    }

    this.container.logger.error(error);

    return "Произошла непредвиденная ошибка. Попробуйте позже.";
  }
}
