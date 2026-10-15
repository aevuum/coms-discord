import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, StringSelectMenuInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { MemberSearchService } from "../../manage/service/memberSearchService.js";
import { ShopAdminContainer } from "../lib/shopAdminContainer.js";
import { ShopAdminAction, ShopCustomIds } from "../lib/shopCustomIds.js";
import { ShopFormatter } from "../lib/shopFormatter.js";
import { ShopService } from "../service/shopService.js";

const SELECT_ACTIONS = new Set<ShopAdminAction>([
  ShopAdminAction.Item,
  ShopAdminAction.InventoryMember,
  ShopAdminAction.Give,
  ShopAdminAction.Take,
]);

export class ShopAdminSelectHandler extends InteractionHandler {
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
    const parsed = ShopCustomIds.parseAdmin(interaction.customId);

    if (!parsed || !SELECT_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some({
      ...parsed,
      value: interaction.values[0],
    });
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    result: {
      action: ShopAdminAction;
      args: string[];
      value: string;
    },
  ) {
    try {
      await ShopService.assertCanManage(interaction);

      if (result.action === ShopAdminAction.Item) {
        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [
            ShopAdminContainer.item(await ShopService.getItem(result.value)),
          ],
        });

        return;
      }

      const discordId =
        result.action === ShopAdminAction.InventoryMember
          ? result.value
          : result.args[0];

      let notice: string | undefined;

      if (result.action === ShopAdminAction.Give) {
        const given = await ShopService.adminGive(discordId, result.value);

        notice = `Выдан ${ShopFormatter.title(given.item)}, теперь ${given.quantity} шт.`;
      }

      if (result.action === ShopAdminAction.Take) {
        const taken = await ShopService.adminTake(discordId, result.value);

        notice = `Забран ${ShopFormatter.title(taken.item)}, осталось ${taken.quantity} шт.`;
      }

      const member = await MemberSearchService.getMember(discordId);

      const view = await ShopService.getPlayerAdminView(discordId);

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [
          ShopAdminContainer.player(
            member?.displayName ?? discordId,
            discordId,
            view.balance,
            view.inventory,
            view.items,
            notice,
          ),
        ],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
