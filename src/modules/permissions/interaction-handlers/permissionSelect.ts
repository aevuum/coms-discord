import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, StringSelectMenuInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import {
  PermissionAction,
  PermissionCustomIds,
} from "../lib/permissionCustomIds.js";
import { PermissionContainer } from "../lib/permissionContainer.js";
import { PermissionService } from "../service/permissionService.js";

export class PermissionSelectHandler extends InteractionHandler {
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
    const parsed = PermissionCustomIds.parse(interaction.customId);

    if (
      !parsed ||
      (parsed.action !== PermissionAction.Target &&
        parsed.action !== PermissionAction.Roles)
    ) {
      return this.none();
    }

    return this.some({
      action: parsed.action,
      args: parsed.args,
      values: [...interaction.values],
    });
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    result: {
      action: PermissionAction;
      args: string[];
      values: string[];
    },
  ) {
    try {
      const subject = await PermissionService.resolveSubject(interaction);

      let key = result.values[0];
      let page = 0;

      if (result.action === PermissionAction.Roles) {
        key = result.args[0];
        page = Number(result.args[1]) || 0;

        await PermissionService.setRolesOnPage(
          subject,
          key,
          page,
          result.values,
        );
      }

      const view = await PermissionService.getTargetView(subject, key, page);

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [
          PermissionContainer.target(view.target, view.rolePage, view.roleNames),
        ],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
