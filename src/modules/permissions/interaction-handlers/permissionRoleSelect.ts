import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, RoleSelectMenuInteraction } from "discord.js";

import {
  PermissionAction,
  PermissionCustomIds,
} from "../lib/permissionCustomIds.js";
import { PermissionContainer } from "../lib/permissionContainer.js";
import { PermissionResponder } from "../lib/permissionResponder.js";
import { PermissionService } from "../service/permissionService.js";

export class PermissionRoleSelectHandler extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.SelectMenu,
    });
  }

  public override parse(interaction: RoleSelectMenuInteraction) {
    const parsed = PermissionCustomIds.parse(interaction.customId);

    if (!parsed || parsed.action !== PermissionAction.Roles) {
      return this.none();
    }

    return this.some({
      commandName: parsed.args[0],
      roleIds: [...interaction.values],
    });
  }

  public override async run(
    interaction: RoleSelectMenuInteraction,
    result: {
      commandName: string;
      roleIds: string[];
    },
  ) {
    try {
      const command = await PermissionService.setRoles(
        interaction,
        result.commandName,
        result.roleIds,
      );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [
          PermissionContainer.command(command, PermissionService.MAX_ROLES),
        ],
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      await PermissionResponder.error(interaction, error);
    }
  }
}
