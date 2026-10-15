import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import {
  PermissionAction,
  PermissionCustomIds,
} from "../lib/permissionCustomIds.js";
import { PermissionContainer } from "../lib/permissionContainer.js";
import { PermissionService } from "../service/permissionService.js";

const BUTTON_ACTIONS = new Set<PermissionAction>([
  PermissionAction.Overview,
  PermissionAction.RolePage,
  PermissionAction.Reset,
]);

export class PermissionButtonHandler extends InteractionHandler {
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
    const parsed = PermissionCustomIds.parse(interaction.customId);

    if (!parsed || !BUTTON_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ButtonInteraction,
    result: {
      action: PermissionAction;
      args: string[];
    },
  ) {
    try {
      const subject = await PermissionService.resolveSubject(interaction);

      if (result.action === PermissionAction.Overview) {
        const overview = await PermissionService.getOverview(subject);

        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [
            PermissionContainer.overview(overview.targets, overview.roleNames),
          ],
        });

        return;
      }

      const [key, pageArg] = result.args;

      if (result.action === PermissionAction.Reset) {
        await PermissionService.setRoles(subject, key, []);
      }

      const view = await PermissionService.getTargetView(
        subject,
        key,
        Number(pageArg) || 0,
      );

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
