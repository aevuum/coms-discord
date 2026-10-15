import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import {
  MessageFlags,
  type ButtonInteraction,
} from "discord.js";

import { ShopContainer } from "../lib/shopContainer.js";
import { ShopAction, ShopCustomIds } from "../lib/shopCustomIds.js";
import { ShopResponder } from "../lib/shopResponder.js";
import { ShopService } from "../service/shopService.js";

export class ShopButtonHandler extends InteractionHandler {
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
    const parsed = ShopCustomIds.parseShop(interaction.customId);

    if (
      !parsed ||
      (parsed.action !== ShopAction.Home && parsed.action !== ShopAction.Buy)
    ) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ButtonInteraction,
    result: {
      action: ShopAction;
      args: string[];
    },
  ) {
    try {
      if (result.action === ShopAction.Buy) {
        const purchase = await ShopService.purchase(
          interaction.user.id,
          result.args[0],
        );

        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [ShopContainer.purchased(purchase)],
        });

        return;
      }

      const storefront = await ShopService.getStorefront(interaction.user.id);

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [
          ShopContainer.storefront(storefront.items, storefront.balance),
        ],
      });
    } catch (error) {
      await ShopResponder.error(interaction, error);
    }
  }
}
