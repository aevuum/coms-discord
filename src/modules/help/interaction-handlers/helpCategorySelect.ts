import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, StringSelectMenuInteraction } from "discord.js";

import { HelpAction, HelpCustomIds } from "../lib/helpCustomIds.js";
import { HelpContainer } from "../lib/helpContainer.js";
import { HelpService } from "../service/helpService.js";

export class HelpCategorySelectHandler extends InteractionHandler {
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
    const parsed = HelpCustomIds.parse(interaction.customId);

    if (!parsed || parsed.action !== HelpAction.Category) {
      return this.none();
    }

    return this.some({
      index: Number(interaction.values[0]),
      mask: parsed.args[0] ?? "",
    });
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    result: {
      index: number;
      mask: string;
    },
  ) {
    try {
      const help = await HelpService.getPage(result.mask, result.index);

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [HelpContainer.page(help)],
      });
    } catch (error) {
      this.container.logger.error(error);

      await interaction
        .update({
          flags: MessageFlags.IsComponentsV2,
          components: [
            HelpContainer.error("Не удалось загрузить список команд."),
          ],
        })
        .catch(() => {});
    }
  }
}
