import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags } from "discord.js";

import { ManageComponents } from "../../manage/lib/manageComponents.js";
import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { ShopAdminContainer } from "../lib/shopAdminContainer.js";
import { ShopAdminAction, ShopCustomIds } from "../lib/shopCustomIds.js";
import { ShopFormatter } from "../lib/shopFormatter.js";
import { ShopService } from "../service/shopService.js";

const BUTTON_ACTIONS = new Set<ShopAdminAction>([
  ShopAdminAction.Root,
  ShopAdminAction.Create,
  ShopAdminAction.Edit,
  ShopAdminAction.Toggle,
  ShopAdminAction.ToggleSlot,
  ShopAdminAction.Delete,
  ShopAdminAction.DeleteConfirm,
  ShopAdminAction.Inventory,
]);

export class ShopAdminButtonHandler extends InteractionHandler {
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
    const parsed = ShopCustomIds.parseAdmin(interaction.customId);

    if (!parsed || !BUTTON_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ButtonInteraction,
    result: {
      action: ShopAdminAction;
      args: string[];
    },
  ) {
    const [itemId] = result.args;

    try {
      if (result.action === ShopAdminAction.Create) {
        await interaction.showModal(ShopAdminContainer.itemModal());
        return;
      }

      if (result.action === ShopAdminAction.Inventory) {
        await interaction.showModal(
          ManageComponents.memberSearchModal(
            ShopCustomIds.admin(ShopAdminAction.InventorySearch),
            "Инвентарь игрока",
          ),
        );
        return;
      }

      if (result.action === ShopAdminAction.Edit) {
        await interaction.showModal(
          ShopAdminContainer.itemModal(await ShopService.getItem(itemId)),
        );
        return;
      }

      await ShopService.assertCanManage(interaction);

      const container = await this.resolve(result.action, itemId);

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }

  private async resolve(action: ShopAdminAction, itemId: string) {
    switch (action) {
      case ShopAdminAction.Toggle:
        return ShopAdminContainer.item(await ShopService.toggleItem(itemId));

      case ShopAdminAction.ToggleSlot:
        return ShopAdminContainer.item(await ShopService.toggleCharacterSlot(itemId));

      case ShopAdminAction.Delete:
        return ShopAdminContainer.deleteConfirm(await ShopService.getItem(itemId));

      case ShopAdminAction.DeleteConfirm: {
        const item = await ShopService.deleteItem(itemId);

        return ShopAdminContainer.result(
          "Товар удалён",
          `${ShopFormatter.title(item)} удалён из магазина и инвентарей.`,
        );
      }

      default:
        return ShopAdminContainer.root(await ShopService.listAllItems());
    }
  }
}
