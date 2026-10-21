import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags } from "discord.js";

import {
  CharacterCardContainer,
  FAMILIAR_CARD_PREFIX,
  FamiliarCardAction,
} from "../lib/characterCardContainer.js";
import { ProfileService } from "../service/profileService.js";
import { ProfileError } from "../types/profile.js";

export class FamiliarCardButton extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button,
    });
  }

  public override parse(interaction: ButtonInteraction) {
    const [prefix, action, characterId] = interaction.customId.split(":");

    if (prefix !== FAMILIAR_CARD_PREFIX || !characterId) {
      return this.none();
    }

    return this.some({ action: action as FamiliarCardAction, characterId });
  }

  public override async run(
    interaction: ButtonInteraction,
    result: {
      action: FamiliarCardAction;
      characterId: string;
    },
  ) {
    try {
      const character = await ProfileService.getOwnedCharacter(
        interaction.user.id,
        result.characterId,
      );

      if (result.action === FamiliarCardAction.View) {
        if (!character.familiar) {
          throw new ProfileError("У персонажа больше нет фамильяра.");
        }

        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [CharacterCardContainer.familiar(character, character.familiar)],
        });

        return;
      }

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [
          CharacterCardContainer.build(
            character,
            await ProfileService.getCharacterInventory(character.id),
          ),
        ],
      });
    } catch (error) {
      if (!(error instanceof ProfileError)) {
        this.container.logger.error(error);
      }

      await interaction
        .reply({
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          components: [
            CharacterCardContainer.notice(
              "<:240191mark:1518581039172292688> Ошибка",
              error instanceof ProfileError
                ? error.message
                : "Произошла непредвиденная ошибка. Попробуйте позже.",
            ),
          ],
        })
        .catch(() => null);
    }
  }
}
