import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags } from "discord.js";

import { ManageComponents } from "../../manage/lib/manageComponents.js";
import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { PermissionService } from "../../permissions/service/permissionService.js";
import { CoinsAdminContainer } from "../lib/coinsAdminContainer.js";
import { CoinsAdminAction, CoinsCustomIds } from "../lib/coinsCustomIds.js";
import { CoinService } from "../service/coinService.js";
import { StipendService } from "../service/stipendService.js";
import { ActivityService } from "../../activity/service/activityService.js";

const BUTTON_ACTIONS = new Set<CoinsAdminAction>([
  CoinsAdminAction.Root,
  CoinsAdminAction.Add,
  CoinsAdminAction.RolePage,
  CoinsAdminAction.Edit,
  CoinsAdminAction.Delete,
  CoinsAdminAction.DeleteConfirm,
  CoinsAdminAction.Balance,
  CoinsAdminAction.Adjust,
  CoinsAdminAction.Activity,
  CoinsAdminAction.ActivityEdit,
]);

export class CoinsAdminButtonHandler extends InteractionHandler {
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
    const parsed = CoinsCustomIds.parse(interaction.customId);

    if (!parsed || !BUTTON_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ButtonInteraction,
    result: {
      action: CoinsAdminAction;
      args: string[];
    },
  ) {
    try {
      switch (result.action) {
        case CoinsAdminAction.Edit:
          await interaction.showModal(
            CoinsAdminContainer.amountModal(result.args[0]),
          );
          return;

        case CoinsAdminAction.ActivityEdit:
          await interaction.showModal(
            CoinsAdminContainer.activityModal(await ActivityService.getRewards()),
          );
          return;

        case CoinsAdminAction.Balance:
          await interaction.showModal(
            ManageComponents.memberSearchModal(
              CoinsCustomIds.build(CoinsAdminAction.BalanceSearch),
              "Баланс игрока",
            ),
          );
          return;

        case CoinsAdminAction.Adjust:
          await interaction.showModal(
            CoinsAdminContainer.adjustModal(
              result.args[0] === "remove" ? "remove" : "add",
              result.args[1],
            ),
          );
          return;
      }

      const guildId = await CoinService.assertCanManage(interaction);

      const container = await this.resolve(guildId, result);

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }

  private async resolve(
    guildId: string,
    result: {
      action: CoinsAdminAction;
      args: string[];
    },
  ) {
    const [arg] = result.args;

    switch (result.action) {
      case CoinsAdminAction.Add:
      case CoinsAdminAction.RolePage:
        return CoinsAdminContainer.rolePicker(
          await PermissionService.getRolePage(guildId, Number(arg) || 0),
        );

      case CoinsAdminAction.Activity:
        return CoinsAdminContainer.activity(await ActivityService.getRewards());

      case CoinsAdminAction.Delete:
        return CoinsAdminContainer.deleteConfirm(
          await StipendService.get(guildId, arg),
        );

      case CoinsAdminAction.DeleteConfirm:
        await StipendService.delete(guildId, arg);
        return CoinsAdminContainer.root(await StipendService.list(guildId));

      default:
        return CoinsAdminContainer.root(await StipendService.list(guildId));
    }
  }
}
