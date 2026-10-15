import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import {
  MessageFlags,
  type StringSelectMenuInteraction,
} from "discord.js";

import { ShopContainer } from "../lib/shopContainer.js";
import { ShopAction, ShopCustomIds } from "../lib/shopCustomIds.js";
import { ShopResponder } from "../lib/shopResponder.js";
import { ShopService } from "../service/shopService.js";

export class ShopItemSelectHandler extends InteractionHandler {
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
    const parsed = ShopCustomIds.parseShop(interaction.customId);

    if (!parsed || parsed.action !== ShopAction.Item) {
      return this.none();
    }

    return this.some({
      itemId: interaction.values[0],
    });
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    result: {
      itemId: string;
    },
  ) {
    try {
      const view = await ShopService.getItemView(
        interaction.user.id,
        result.itemId,
      );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [ShopContainer.item(view.item, view.balance, view.owned)],
      });
    } catch (error) {
      await ShopResponder.error(interaction, error);
    }
  }
}
