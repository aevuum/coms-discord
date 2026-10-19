import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import {
  MessageFlags,
  type ButtonInteraction,
  type Interaction,
  type StringSelectMenuInteraction,
} from "discord.js";

import { RollContainer } from "../lib/rollContainer.js";
import { RollCustomIds } from "../lib/rollCustomIds.js";
import { kindBySlug } from "../lib/rollKinds.js";
import { RollResponder } from "../lib/rollResponder.js";
import { RollService } from "../service/rollService.js";
import { RollError } from "../types/rolls.js";

type CatalogAction = {
  action: "list" | "view";
  slug: string;
};

export class RollCatalogHandler extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.MessageComponent,
    });
  }

  public override parse(interaction: Interaction) {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) {
      return this.none();
    }

    const parsed = RollCustomIds.parseCatalog(interaction.customId);

    return parsed ? this.some<CatalogAction>(parsed) : this.none();
  }

  public override async run(
    interaction: ButtonInteraction | StringSelectMenuInteraction,
    result: CatalogAction,
  ) {
    try {
      const meta = kindBySlug(result.slug);

      if (!meta) {
        throw new RollError("Неизвестный раздел.");
      }

      const entries = await RollService.list(meta.kind);

      if (result.action === "list" || !interaction.isStringSelectMenu()) {
        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [RollContainer.catalog(meta, entries)],
        });

        return;
      }

      const entry = entries.find((item) => item.id === interaction.values[0]);

      if (!entry) {
        throw new RollError("Этот вариант больше недоступен. Откройте список заново.");
      }

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [RollContainer.catalogEntry(meta, entry, RollService.effectiveChance(entry, entries))],
      });
    } catch (error) {
      await RollResponder.error(interaction as ButtonInteraction, error);
    }
  }
}
