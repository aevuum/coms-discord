import { Listener } from "@sapphire/framework";
import type { Client } from "discord.js";

import { GiveawayService } from "../service/giveawayService.js";

const CHECK_INTERVAL_MS = 30 * 1000;

export class GiveawaySchedulerListener extends Listener {
  private running = false;

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
    await this.tick(client);

    setInterval(() => void this.tick(client), CHECK_INTERVAL_MS).unref();
  }

  private async tick(client: Client<true>) {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      const finished = await GiveawayService.runDue(client);

      if (finished) {
        this.container.logger.info(`Finished ${finished} giveaways`);
      }
    } catch (error) {
      this.container.logger.error(error);
    } finally {
      this.running = false;
    }
  }
}
