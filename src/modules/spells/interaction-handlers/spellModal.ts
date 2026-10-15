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
      action: SpellAction;
      args: string[];
    },
  ) {
    try {
      await SpellService.assertCanManage(interaction);

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

      const components = [SpellContainer.detail(spell, SpellMode.Manage, page)];

      if (interaction.isFromMessage()) {
        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components,
        });

        return;
      }

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components,
      });
    } catch (error) {
      await SpellResponder.error(interaction, error);
    }
  }
}
