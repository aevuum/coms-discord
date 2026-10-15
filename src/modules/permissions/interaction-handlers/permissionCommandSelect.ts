import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, StringSelectMenuInteraction } from "discord.js";

import {
  PermissionAction,
  PermissionCustomIds,
} from "../lib/permissionCustomIds.js";
import { PermissionContainer } from "../lib/permissionContainer.js";
import { PermissionResponder } from "../lib/permissionResponder.js";
import { PermissionService } from "../service/permissionService.js";

export class PermissionCommandSelectHandler extends InteractionHandler {
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

    if (!parsed || parsed.action !== PermissionAction.Command) {
      return this.none();
    }

    return this.some({
      commandName: interaction.values[0],
    });
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    result: {
      commandName: string;
    },
  ) {
    try {
      PermissionService.assertAdmin(interaction);

      const command = await PermissionService.getCommandEntry(
        interaction.guildId as string,
        result.commandName,
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
