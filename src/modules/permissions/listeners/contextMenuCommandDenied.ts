import {
  Events,
  Listener,
  type ContextMenuCommandDeniedPayload,
  type UserError,
} from "@sapphire/framework";

import { MessageFlags } from "discord.js";

import { PermissionContainer } from "../lib/permissionContainer.js";

export class ContextMenuCommandDeniedListener extends Listener<
  typeof Events.ContextMenuCommandDenied
> {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: Events.ContextMenuCommandDenied,
    });
  }

  public override async run(
    error: UserError,
    { interaction }: ContextMenuCommandDeniedPayload,
  ) {
    const payload = {
      components: [PermissionContainer.error(error.message)],
    };

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          ...payload,
          flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        });

        return;
      }

      await interaction.reply({
        ...payload,
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      });
    } catch (replyError) {
      this.container.logger.error(replyError);
    }
  }
}
