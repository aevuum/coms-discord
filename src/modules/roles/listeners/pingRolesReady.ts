import { Listener } from "@sapphire/framework";

import type { Client } from "discord.js";

import { PingRolesService } from "../service/pingRolesService.js";

export class PingRolesReadyListener extends Listener {
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
      const { message, created } = await PingRolesService.syncPanel(client);

      this.container.logger.info(
        `Ping roles panel ${created ? "posted" : "updated"}: ${message.id}`,
      );
    } catch (error) {
      this.container.logger.error(error);
    }
  }
}
