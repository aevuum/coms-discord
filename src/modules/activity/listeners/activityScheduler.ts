import { Listener } from "@sapphire/framework";
import type { Client } from "discord.js";

import { ActivityService } from "../service/activityService.js";

const CHECK_INTERVAL_MS = 10 * 60 * 1000;

export class ActivitySchedulerListener extends Listener {
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
      const winners = await ActivityService.runDue(client);

      if (winners) {
        this.container.logger.info(`Weekly activity reset, rewarded ${winners.length} players`);
      }
    } catch (error) {
      this.container.logger.error(error);
    } finally {
      this.running = false;
    }
  }
}
