import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags } from "discord.js";

import { SpellAction, SpellCustomIds } from "../lib/spellCustomIds.js";
import { SpellComponents } from "../lib/spellComponents.js";
import { SpellContainer } from "../lib/spellContainer.js";
import { SpellResponder } from "../lib/spellResponder.js";
import { SpellService } from "../service/spellService.js";
import { SpellMode } from "../types/spells.js";

const BUTTON_ACTIONS = new Set<SpellAction>([
  SpellAction.Page,
  SpellAction.Open,
  SpellAction.Create,
  SpellAction.Edit,
  SpellAction.Delete,
  SpellAction.DeleteConfirm,
]);

export class SpellButtonHandler extends InteractionHandler {
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
    const parsed = SpellCustomIds.parse(interaction.customId);

    if (!parsed || !BUTTON_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ButtonInteraction,
    result: {
      mode: SpellMode;
      action: SpellAction;
      args: string[];
    },
  ) {
    try {
      if (result.mode === SpellMode.Manage) {
        await SpellService.assertCanManage(interaction);
      }

      switch (result.action) {
        case SpellAction.Page: {
          const page = await SpellService.getPage(Number(result.args[0]));

          await interaction.update({
            flags: MessageFlags.IsComponentsV2,
            components: [SpellContainer.page(page, result.mode)],
          });

          return;
        }

        case SpellAction.Open: {
          const [spellId, page] = result.args;

          const spell = await SpellService.getSpell(spellId);

          await interaction.update({
            flags: MessageFlags.IsComponentsV2,
            components: [
              SpellContainer.detail(spell, result.mode, Number(page) || 0),
            ],
          });

          return;
        }

        case SpellAction.Create: {
          await interaction.showModal(SpellComponents.spellModal());

          return;
        }

        case SpellAction.Edit: {
          const [spellId, page] = result.args;

          const spell = await SpellService.getSpell(spellId);

          await interaction.showModal(
            SpellComponents.spellModal(spell, Number(page) || 0),
          );

          return;
        }

        case SpellAction.Delete: {
          const [spellId, page] = result.args;

          const spell = await SpellService.getSpell(spellId);

          await interaction.update({
            flags: MessageFlags.IsComponentsV2,
            components: [SpellContainer.deleteConfirm(spell, Number(page) || 0)],
          });

          return;
        }

        case SpellAction.DeleteConfirm: {
          const [spellId, page] = result.args;

          const spell = await SpellService.delete(spellId);

          await interaction.update({
            flags: MessageFlags.IsComponentsV2,
            components: [SpellContainer.deleted(spell, Number(page) || 0)],
          });

          return;
        }
      }
    } catch (error) {
      await SpellResponder.error(interaction, error);
    }
  }
}
