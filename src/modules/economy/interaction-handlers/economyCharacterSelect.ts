import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, StringSelectMenuInteraction } from "discord.js";

import { EconomyAction, EconomyCustomIds } from "../lib/economyCustomIds.js";
import { EconomyContainer } from "../lib/economyContainer.js";
import { EconomyResponder } from "../lib/economyResponder.js";
import { EconomyService } from "../services/economyService.js";

export class EconomyCharacterSelectHandler extends InteractionHandler {
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
    const parsed = EconomyCustomIds.parse(interaction.customId);

    if (!parsed || parsed.action !== EconomyAction.Character) {
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
    try {
      const card = await EconomyService.getCharacterCard(
        interaction.user.id,
        result.characterId,
      );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [EconomyContainer.main(card.character, card.hasMultiple)],
      });
    } catch (error) {
      await EconomyResponder.error(interaction, error);
    }
  }
}
