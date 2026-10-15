import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, StringSelectMenuInteraction } from "discord.js";

import { SpellAction, SpellCustomIds } from "../lib/spellCustomIds.js";
import { SpellContainer } from "../lib/spellContainer.js";
import { SpellResponder } from "../lib/spellResponder.js";
import { SpellService } from "../service/spellService.js";
import { SpellMode } from "../types/spells.js";

export class SpellSelectHandler extends InteractionHandler {
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
    const parsed = SpellCustomIds.parse(interaction.customId);

    if (!parsed || parsed.action !== SpellAction.Select) {
      return this.none();
    }

    return this.some({
      mode: parsed.mode,
      page: Number(parsed.args[0]) || 0,
      spellId: interaction.values[0],
    });
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    result: {
      mode: SpellMode;
      page: number;
      spellId: string;
    },
  ) {
    try {
      if (result.mode === SpellMode.Manage) {
        await SpellService.assertCanManage(interaction);
      }

      const spell = await SpellService.getSpell(result.spellId);

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [SpellContainer.detail(spell, result.mode, result.page)],
      });
    } catch (error) {
      await SpellResponder.error(interaction, error);
    }
  }
}
