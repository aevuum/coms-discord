import { Listener } from "@sapphire/framework";
import type { Client } from "discord.js";

import { TicketService } from "../service/ticketService.js";

export class TicketReadyListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: "clientReady",
      once: true,
    });
  }

  public override async run(client: Client<true>) {
    try {
      const { message, created } = await TicketService.syncPanel(client);

      this.container.logger.info(
        `Ticket panel ${created ? "posted" : "updated"}: ${message.id}`,
      );

      const guild = client.guilds.cache.get(process.env.GUILD_ID ?? "");

      const removed = guild ? await TicketService.cleanupClosed(guild) : 0;

      if (removed) {
        this.container.logger.info(`Removed ${removed} closed ticket channels`);
      }
    } catch (error) {
      this.container.logger.error(error);
    }
  }
}
