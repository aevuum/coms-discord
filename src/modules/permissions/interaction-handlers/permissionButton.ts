import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags } from "discord.js";

import {
  PermissionAction,
  PermissionCustomIds,
} from "../lib/permissionCustomIds.js";
import { PermissionContainer } from "../lib/permissionContainer.js";
import { PermissionResponder } from "../lib/permissionResponder.js";
import { PermissionService } from "../service/permissionService.js";

const BUTTON_ACTIONS = new Set<PermissionAction>([
  PermissionAction.Reset,
  PermissionAction.Back,
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
      if (result.action === PermissionAction.Reset) {
        const command = await PermissionService.setRoles(
          interaction,
          result.args[0],
          [],
        );

        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [
            PermissionContainer.command(command, PermissionService.MAX_ROLES),
          ],
          allowedMentions: { parse: [] },
        });

        return;
      }

      PermissionService.assertAdmin(interaction);

      const commands = await PermissionService.listCommands(
        interaction.guildId as string,
      );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [PermissionContainer.overview(commands)],
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      await PermissionResponder.error(interaction, error);
    }
  }
}
