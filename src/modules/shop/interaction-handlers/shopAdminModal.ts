import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, ModalSubmitInteraction } from "discord.js";

import { MEMBER_QUERY_FIELD } from "../../manage/lib/manageCustomIds.js";
import { ManageContainer } from "../../manage/lib/manageContainer.js";
import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { MemberSearchService } from "../../manage/service/memberSearchService.js";
import { ShopAdminContainer } from "../lib/shopAdminContainer.js";
import {
  ShopAdminAction,
  ShopCustomIds,
  ShopModalFields,
} from "../lib/shopCustomIds.js";
import { ShopService } from "../service/shopService.js";

const MODAL_ACTIONS = new Set<ShopAdminAction>([
  ShopAdminAction.CreateModal,
  ShopAdminAction.EditModal,
  ShopAdminAction.InventorySearch,
]);

export class ShopAdminModalHandler extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
    });
  }

  public override parse(interaction: ModalSubmitInteraction) {
    const parsed = ShopCustomIds.parseAdmin(interaction.customId);

    if (!parsed || !MODAL_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ModalSubmitInteraction,
    result: {
      action: ShopAdminAction;
      args: string[];
    },
  ) {
    try {
      await ShopService.assertCanManage(interaction);

      const container = await this.resolve(interaction, result);

      if (interaction.isFromMessage()) {
        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [container],
        });

        return;
      }

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [container],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }

  private async resolve(
    interaction: ModalSubmitInteraction,
    result: {
      action: ShopAdminAction;
      args: string[];
    },
  ) {
    if (result.action === ShopAdminAction.InventorySearch) {
      const query = interaction.fields.getTextInputValue(MEMBER_QUERY_FIELD);

      return ManageContainer.memberResults(
        "Инвентарь игрока",
        query,
        await MemberSearchService.search(query),
        ShopCustomIds.admin(ShopAdminAction.InventoryMember),
        ShopCustomIds.admin(ShopAdminAction.Inventory),
      );
    }

    const input = {
      name: interaction.fields.getTextInputValue(ShopModalFields.Name),
      emoji: interaction.fields.getTextInputValue(ShopModalFields.Emoji),
      description: interaction.fields.getTextInputValue(
        ShopModalFields.Description,
      ),
      price: interaction.fields.getTextInputValue(ShopModalFields.Price),
      maxPerUser: interaction.fields.getTextInputValue(ShopModalFields.Limit),
    };

    const item =
      result.action === ShopAdminAction.EditModal
        ? await ShopService.updateItem(result.args[0], input)
        : await ShopService.createItem(input);

    return ShopAdminContainer.item(item);
  }
}
