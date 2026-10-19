import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { MessageFlags, type StringSelectMenuInteraction } from "discord.js";

import { SuggestionAction, SuggestionCustomIds } from "../lib/suggestionConfig.js";
import { SuggestionContainer } from "../lib/suggestionContainer.js";
import { SuggestionResponder } from "../lib/suggestionResponder.js";
import { SuggestionRepository } from "../repositories/suggestionRepository.js";
import { SuggestionService } from "../service/suggestionService.js";
import { SuggestionError } from "../types/suggestion.js";

export class SuggestionRateHandler extends InteractionHandler {
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
    const parsed = SuggestionCustomIds.parse(interaction.customId);

    if (parsed?.action !== SuggestionAction.Rate || !parsed.id) {
      return this.none();
    }

    return this.some(parsed.id);
  }

  public override async run(interaction: StringSelectMenuInteraction, id: string) {
    const stars = Number(interaction.values[0]);

    try {
      if (!interaction.inCachedGuild()) {
        throw new SuggestionError("Идеи работают только на сервере.");
      }

      const suggestion = await SuggestionService.rate(interaction.member, id, stars);

      await this.render(interaction, suggestion);

      await interaction.followUp({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [SuggestionContainer.success(`Ваша оценка: ${SuggestionContainer.stars(stars)}`)],
      });
    } catch (error) {
      if (!interaction.replied && !interaction.deferred) {
        const current = await SuggestionRepository.findById(id).catch(() => null);

        if (current) {
          await this.render(interaction, current).catch(() => null);
        }
      }

      await SuggestionResponder.error(interaction, error);
    }
  }

  private async render(
    interaction: StringSelectMenuInteraction,
    suggestion: NonNullable<Awaited<ReturnType<typeof SuggestionRepository.findById>>>,
  ) {
    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [SuggestionContainer.card(suggestion)],
      allowedMentions: { parse: [] },
    });
  }
}
