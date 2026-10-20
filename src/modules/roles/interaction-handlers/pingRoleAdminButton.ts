import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { MessageFlags, type ButtonInteraction, type Client } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { PingRoleAdminContainer } from "../lib/pingRoleAdminContainer.js";
import { PingRoleAdminViews } from "../lib/pingRoleAdminViews.js";
import { PingRoleAdminAction, PingRoleAdminIds } from "../lib/pingRoles.js";
import { PingRolesService } from "../service/pingRolesService.js";

const BUTTON_ACTIONS = new Set<PingRoleAdminAction>([
  PingRoleAdminAction.Root,
  PingRoleAdminAction.View,
  PingRoleAdminAction.AddPage,
  PingRoleAdminAction.Edit,
  PingRoleAdminAction.Up,
  PingRoleAdminAction.Down,
  PingRoleAdminAction.Remove,
  PingRoleAdminAction.RemoveConfirm,
]);

type AdminButton = {
  action: PingRoleAdminAction;
  args: string[];
};

export class PingRoleAdminButtonHandler extends InteractionHandler {
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
    const parsed = PingRoleAdminIds.parse(interaction.customId);

    if (!parsed || !BUTTON_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some<AdminButton>(parsed);
  }

  public override async run(interaction: ButtonInteraction, result: AdminButton) {
    const [arg] = result.args;

    try {
      if (result.action === PingRoleAdminAction.Edit) {
        await PingRolesService.assertCanManage(interaction);

        const role = await PingRolesService.get(arg);

        await interaction.showModal(
          PingRoleAdminContainer.modal(
            PingRoleAdminIds.build(PingRoleAdminAction.EditModal, role.roleId),
            `Пинг-роль: ${role.label}`,
            { label: role.label, emoji: role.emoji ?? "", description: role.description ?? "" },
          ),
        );

        return;
      }

      await interaction.deferUpdate();

      await PingRolesService.assertCanManage(interaction);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [await this.resolve(interaction.client, result.action, arg)],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }

  private async resolve(client: Client<true>, action: PingRoleAdminAction, arg: string) {
    switch (action) {
      case PingRoleAdminAction.View:
        return PingRoleAdminViews.view(client, arg);

      case PingRoleAdminAction.AddPage:
        return PingRoleAdminViews.addPicker(Number(arg) || 0);

      case PingRoleAdminAction.Up:
        await PingRolesService.move(client, arg, -1);
        return PingRoleAdminViews.view(client, arg);

      case PingRoleAdminAction.Down:
        await PingRolesService.move(client, arg, 1);
        return PingRoleAdminViews.view(client, arg);

      case PingRoleAdminAction.Remove:
        return PingRoleAdminContainer.removeConfirm(await PingRolesService.get(arg));

      case PingRoleAdminAction.RemoveConfirm:
        await PingRolesService.remove(client, arg);
        return PingRoleAdminViews.root(client);

      default:
        return PingRoleAdminViews.root(client);
    }
  }
}
