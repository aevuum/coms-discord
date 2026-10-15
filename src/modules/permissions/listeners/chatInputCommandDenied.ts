import {
  Events,
  Listener,
  type ChatInputCommandDeniedPayload,
  type UserError,
} from "@sapphire/framework";

import { MessageFlags } from "discord.js";

import { PermissionContainer } from "../lib/permissionContainer.js";

export class ChatInputCommandDeniedListener extends Listener<
  typeof Events.ChatInputCommandDenied
> {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: Events.ChatInputCommandDenied,
    });
  }

  public override async run(
    error: UserError,
    { interaction }: ChatInputCommandDeniedPayload,
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
