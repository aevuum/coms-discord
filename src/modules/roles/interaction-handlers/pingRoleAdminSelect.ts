import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { MessageFlags, type StringSelectMenuInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { PingRoleAdminContainer } from "../lib/pingRoleAdminContainer.js";
import { PingRoleAdminViews } from "../lib/pingRoleAdminViews.js";
import { PingRoleAdminAction, PingRoleAdminIds } from "../lib/pingRoles.js";
import { PingRolesService } from "../service/pingRolesService.js";

export class PingRoleAdminSelectHandler extends InteractionHandler {
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
    const parsed = PingRoleAdminIds.parse(interaction.customId);

    if (parsed?.action !== PingRoleAdminAction.View && parsed?.action !== PingRoleAdminAction.AddPick) {
      return this.none();
    }

    return this.some(parsed.action);
  }

  public override async run(interaction: StringSelectMenuInteraction, action: PingRoleAdminAction) {
    const [roleId] = interaction.values;

    try {
      await PingRolesService.assertCanManage(interaction);

      if (action === PingRoleAdminAction.AddPick) {
        const role = await PingRolesService.assertAddable(PingRolesService.getGuild(interaction.client), roleId);

        await interaction.showModal(
          PingRoleAdminContainer.modal(
            PingRoleAdminIds.build(PingRoleAdminAction.AddModal, role.id),
            "Новая пинг-роль",
            { label: PingRoleAdminContainer.cleanName(role.name) || role.name, emoji: "", description: "" },
          ),
        );

        return;
      }

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [await PingRoleAdminViews.view(interaction.client, roleId)],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
