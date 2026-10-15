import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags } from "discord.js";

import { HelpAction, HelpCustomIds } from "../lib/helpCustomIds.js";
import { HelpContainer } from "../lib/helpContainer.js";
import { HelpService } from "../service/helpService.js";

export class HelpButtonHandler extends InteractionHandler {
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
    const parsed = HelpCustomIds.parse(interaction.customId);

    if (!parsed || parsed.action !== HelpAction.Page) {
      return this.none();
    }

    return this.some({
      index: Number(parsed.args[0]),
      mask: parsed.args[1] ?? "",
    });
  }

  public override async run(
    interaction: ButtonInteraction,
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
