import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { MessageFlags, type ModalSubmitInteraction } from "discord.js";

import { SuggestionAction, SuggestionCustomIds, SuggestionFields } from "../lib/suggestionConfig.js";
import { SuggestionContainer } from "../lib/suggestionContainer.js";
import { SuggestionResponder } from "../lib/suggestionResponder.js";
import { SuggestionService } from "../service/suggestionService.js";
import { SuggestionError } from "../types/suggestion.js";

type SuggestionModal = {
  action: SuggestionAction;
  id: string | null;
};

export class SuggestionModalHandler extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
    });
  }

  public override parse(interaction: ModalSubmitInteraction) {
    const parsed = SuggestionCustomIds.parse(interaction.customId);

    if (parsed?.action !== SuggestionAction.Submit && parsed?.action !== SuggestionAction.RejectModal) {
      return this.none();
    }

    return this.some<SuggestionModal>(parsed);
  }

  public override async run(interaction: ModalSubmitInteraction, result: SuggestionModal) {
    try {
      if (!interaction.inCachedGuild()) {
        throw new SuggestionError("Идеи работают только на сервере.");
      }

      if (result.action === SuggestionAction.RejectModal && result.id) {
        if (!interaction.isFromMessage()) {
          throw new SuggestionError("Не удалось найти карточку идеи.");
        }

        await interaction.deferUpdate();

        const decided = await SuggestionService.decide(
          interaction.member,
          result.id,
          false,
          interaction.fields.getTextInputValue(SuggestionFields.Reason).trim() || null,
        );

        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [SuggestionContainer.card(decided)],
          allowedMentions: { parse: [] },
        });

        return;
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const suggestion = await SuggestionService.submit(interaction.member, {
        title: interaction.fields.getTextInputValue(SuggestionFields.Title),
        category: interaction.fields.getStringSelectValues(SuggestionFields.Category)?.at(0) ?? "other",
        description: interaction.fields.getTextInputValue(SuggestionFields.Description),
        benefit: interaction.fields.getTextInputValue(SuggestionFields.Benefit),
      });

      const url = SuggestionService.messageUrl(suggestion);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          SuggestionContainer.success(
            `Идея #${suggestion.number} отправлена${url ? ` — [посмотреть](${url})` : ""}. Решение администрации придёт вам в личные сообщения.`,
          ),
        ],
      });
    } catch (error) {
      await SuggestionResponder.error(interaction, error);
    }
  }
}
