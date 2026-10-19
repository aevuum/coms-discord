import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, type ButtonInteraction } from "discord.js";

import { ActivityContainer } from "../lib/activityContainer.js";
import { ActivityService, TOP_PAGE_SIZE } from "../service/activityService.js";

export class TopPageHandler extends InteractionHandler {
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
    const [prefix, action, page] = interaction.customId.split(":");

    if (prefix !== "top" || action !== "page") {
      return this.none();
    }

    return this.some(Number(page) || 0);
  }

  public override async run(interaction: ButtonInteraction, page: number) {
    try {
      await interaction.deferUpdate();

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          ActivityContainer.top(await ActivityService.getPage(page, interaction.user.id), TOP_PAGE_SIZE),
        ],
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      this.container.logger.error(error);
    }
  }
}
