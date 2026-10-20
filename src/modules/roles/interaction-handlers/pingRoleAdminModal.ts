import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import type { ModalSubmitInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { PingRoleAdminViews } from "../lib/pingRoleAdminViews.js";
import { PingRoleAdminAction, PingRoleAdminIds, PingRoleFields } from "../lib/pingRoles.js";
import { PingRolesService } from "../service/pingRolesService.js";

type AdminModal = {
  action: PingRoleAdminAction;
  args: string[];
};

export class PingRoleAdminModalHandler extends InteractionHandler {
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
    const parsed = PingRoleAdminIds.parse(interaction.customId);

    if (
      (parsed?.action !== PingRoleAdminAction.AddModal && parsed?.action !== PingRoleAdminAction.EditModal) ||
      !parsed.args[0]
    ) {
      return this.none();
    }

    return this.some<AdminModal>(parsed);
  }

  public override async run(interaction: ModalSubmitInteraction, result: AdminModal) {
    const [roleId] = result.args;

    try {
      await ManageResponder.defer(interaction);

      await PingRolesService.assertCanManage(interaction);

      const data = {
        label: interaction.fields.getTextInputValue(PingRoleFields.Label),
        emoji: interaction.fields.getTextInputValue(PingRoleFields.Emoji),
        description: interaction.fields.getTextInputValue(PingRoleFields.Description),
      };

      const client = interaction.client;

      if (result.action === PingRoleAdminAction.AddModal) {
        await PingRolesService.add(client, roleId, data);
      } else {
        await PingRolesService.edit(client, roleId, data);
      }

      await ManageResponder.send(interaction, await PingRoleAdminViews.view(client, roleId));
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
