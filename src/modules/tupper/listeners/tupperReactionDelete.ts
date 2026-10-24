import { Listener } from "@sapphire/framework";

import type { MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";

import { TupperMessageActions } from "../service/tupperMessageActions.js";

const DELETE_EMOJIS = new Set(["❌", "✖️", "✖", "❎"]);

export class TupperReactionDeleteListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: "messageReactionAdd",
    });
  }

  public override async run(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser) {
    if (user.bot || !reaction.emoji.name || !DELETE_EMOJIS.has(reaction.emoji.name)) {
      return;
    }

    try {
      const record = await TupperMessageActions.find(reaction.message.id);

      if (!record) {
        return;
      }

      if (record.ownerId !== user.id) {
        await reaction.users.remove(user.id).catch(() => null);
        return;
      }

      const result = await TupperMessageActions.remove(reaction.client, record.messageId, user.id);

      if (result?.refund) {
        this.container.logger.info(`Tupper message ${record.groupId} deleted, refunded ${result.refund} mana`);
      }
    } catch (error) {
      this.container.logger.error(error);
    }
  }
}
