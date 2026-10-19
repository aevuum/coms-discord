import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { MessageFlags, type ButtonInteraction } from "discord.js";

import { SuggestionAction, SuggestionCustomIds } from "../lib/suggestionConfig.js";
import { SuggestionContainer } from "../lib/suggestionContainer.js";
import { SuggestionResponder } from "../lib/suggestionResponder.js";
import { SuggestionService } from "../service/suggestionService.js";
import { SuggestionError } from "../types/suggestion.js";

const ACTIONS = [
  SuggestionAction.Open,
  SuggestionAction.Up,
  SuggestionAction.Down,
  SuggestionAction.Accept,
  SuggestionAction.Reject,
];

type SuggestionButton = {
  action: SuggestionAction;
  id: string | null;
};

export class SuggestionButtonHandler extends InteractionHandler {
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
    const parsed = SuggestionCustomIds.parse(interaction.customId);

    if (!parsed || !ACTIONS.includes(parsed.action)) {
      return this.none();
    }

    return this.some<SuggestionButton>(parsed);
  }

  public override async run(interaction: ButtonInteraction, result: SuggestionButton) {
    try {
      if (result.action === SuggestionAction.Open) {
        await interaction.showModal(SuggestionContainer.modal());
        return;
      }

      if (!interaction.inCachedGuild() || !result.id) {
        throw new SuggestionError("Идеи работают только на сервере.");
      }

      if (result.action === SuggestionAction.Reject) {
        await SuggestionService.assertCanDecide(interaction.member, result.id);
        await interaction.showModal(SuggestionContainer.rejectModal(result.id));
        return;
      }

      if (result.action === SuggestionAction.Accept) {
        await SuggestionService.assertCanDecide(interaction.member, result.id);
        await interaction.deferUpdate();

        const decided = await SuggestionService.decide(interaction.member, result.id, true, null);

        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [SuggestionContainer.card(decided)],
          allowedMentions: { parse: [] },
        });

        return;
      }

      const { suggestion, result: vote } = await SuggestionService.react(
        interaction.member,
        result.id,
        result.action === SuggestionAction.Up ? 1 : -1,
      );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [SuggestionContainer.card(suggestion)],
        allowedMentions: { parse: [] },
      });

      await interaction.followUp({
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        components: [
          SuggestionContainer.success(
            vote === 0 ? "Ваш голос снят." : vote > 0 ? "Вы поддержали идею 👍" : "Вы проголосовали против 👎",
          ),
        ],
      });
    } catch (error) {
      await SuggestionResponder.error(interaction, error);
    }
  }
}
