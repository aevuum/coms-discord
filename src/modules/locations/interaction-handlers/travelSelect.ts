import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, type StringSelectMenuInteraction } from "discord.js";

import { TravelAction, TravelCustomIds } from "../lib/locationCustomIds.js";
import { TravelContainer } from "../lib/travelContainer.js";
import { TravelResponder } from "../lib/travelResponder.js";
import { TravelService } from "../service/travelService.js";

export class TravelSelectHandler extends InteractionHandler {
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
    const parsed = TravelCustomIds.parse(interaction.customId);

    if (parsed?.action !== TravelAction.Route) {
      return this.none();
    }

    return this.some(interaction.values[0]);
  }

  public override async run(interaction: StringSelectMenuInteraction, routeId: string) {
    try {
      await interaction.deferUpdate();

      const member = await TravelService.getMember(interaction);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [TravelContainer.confirm(await TravelService.plan(member, routeId))],
      });
    } catch (error) {
      await TravelResponder.error(interaction, error);
    }
  }
}
