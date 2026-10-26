import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, ModalSubmitInteraction } from "discord.js";

import {
  SpellAction,
  SpellCustomIds,
  SpellModalFields,
} from "../lib/spellCustomIds.js";
import { SpellContainer } from "../lib/spellContainer.js";
import { SpellResponder } from "../lib/spellResponder.js";
import { SpellService } from "../service/spellService.js";
import { SpellMode, type SpellInput } from "../types/spells.js";

const MODAL_ACTIONS = new Set<SpellAction>([
  SpellAction.CreateModal,
  SpellAction.EditModal,
  SpellAction.DescriptionModal,
  SpellAction.SearchModal,
]);

export class SpellModalHandler extends InteractionHandler {
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
    const parsed = SpellCustomIds.parse(interaction.customId);

    if (!parsed || !MODAL_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ModalSubmitInteraction,
    result: {
      mode: SpellMode;
      action: SpellAction;
      args: string[];
    },
  ) {
    try {
      if (interaction.isFromMessage()) {
        await interaction.deferUpdate();
      } else {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }

      if (result.action === SpellAction.SearchModal) {
        if (result.mode === SpellMode.Manage) {
          await SpellService.assertCanManage(interaction);
        }

        const query = interaction.fields.getTextInputValue(SpellModalFields.Query);

        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [SpellContainer.search(query, await SpellService.search(query), result.mode)],
        });

        return;
      }

      await SpellService.assertCanManage(interaction);

      if (result.action === SpellAction.DescriptionModal) {
        const [spellId, pageArg] = result.args;

        const spell = await SpellService.setDescription(
          spellId,
          interaction.fields.getTextInputValue(SpellModalFields.Description),
        );

        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [SpellContainer.detail(spell, SpellMode.Manage, Number(pageArg) || 0)],
        });

        return;
      }

      const input: SpellInput = {
        name: interaction.fields.getTextInputValue(SpellModalFields.Name),
        incantations: interaction.fields.getTextInputValue(
          SpellModalFields.Incantations,
        ),
        difficulty:
          interaction.fields.getStringSelectValues(
            SpellModalFields.Difficulty,
          )[0] ?? "",
        manaCost: interaction.fields.getTextInputValue(
          SpellModalFields.ManaCost,
        ),
        imageUrl: interaction.fields.getTextInputValue(
          SpellModalFields.ImageUrl,
        ),
      };

      const [spellId, pageArg] = result.args;

      const page = Number(pageArg) || 0;

      const spell =
        result.action === SpellAction.EditModal
          ? await SpellService.update(spellId, input)
          : await SpellService.create(input);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [SpellContainer.detail(spell, SpellMode.Manage, page)],
      });
    } catch (error) {
      await SpellResponder.error(interaction, error);
    }
  }
}
