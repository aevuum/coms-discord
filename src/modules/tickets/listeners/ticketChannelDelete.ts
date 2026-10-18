import { Listener } from "@sapphire/framework";
import type { DMChannel, GuildChannel } from "discord.js";

import { TICKET_CATEGORY_ID } from "../lib/ticketConfig.js";
import { TicketService } from "../service/ticketService.js";

export class TicketChannelDeleteListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: "channelDelete",
    });
  }

  public override async run(channel: DMChannel | GuildChannel) {
    if (channel.isDMBased() || channel.parentId !== TICKET_CATEGORY_ID) {
      return;
    }

    try {
      await TicketService.handleChannelDelete(channel.guild, channel.id);
    } catch (error) {
      this.container.logger.error(error);
    }
  }
}
