import { Listener } from "@sapphire/framework";
import {
  ChannelType,
  type Client,
  type DMChannel,
  type ForumChannel,
  type GuildChannel,
} from "discord.js";

import { TICKET_TEMPLATES_FORUM_ID } from "../lib/ticketConfig.js";
import { TicketService } from "../service/ticketService.js";

export class TicketForumUpdateListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: "channelUpdate",
    });
  }

  public override async run(
    oldChannel: DMChannel | GuildChannel,
    newChannel: DMChannel | GuildChannel,
  ) {
    if (
      newChannel.id !== TICKET_TEMPLATES_FORUM_ID ||
      newChannel.type !== ChannelType.GuildForum ||
      oldChannel.type !== ChannelType.GuildForum
    ) {
      return;
    }

    const before = JSON.stringify((oldChannel as ForumChannel).availableTags);
    const after = JSON.stringify((newChannel as ForumChannel).availableTags);

    if (before === after) {
      return;
    }

    try {
      await TicketService.syncPanel(this.container.client as Client<true>);

      this.container.logger.info("Ticket panel updated after forum tags change");
    } catch (error) {
      this.container.logger.error(error);
    }
  }
}
