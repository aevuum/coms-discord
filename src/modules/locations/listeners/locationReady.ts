import { Listener } from "@sapphire/framework";
import type { Client } from "discord.js";

import { LocationService } from "../service/locationService.js";
import { TravelService } from "../service/travelService.js";

const ARRIVAL_CHECK_INTERVAL_MS = 30 * 1000;

export class LocationReadyListener extends Listener {
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
    try {
      const seeded = await LocationService.seedDefaults(client);

      if (seeded) {
        this.container.logger.info(`Seeded ${seeded} locations`);
      }

      const panel = await TravelService.syncPanel(client);

      if (panel) {
        this.container.logger.info(`Travel guide panel synced: ${panel.id}`);
      }
    } catch (error) {
      this.container.logger.error(error);
    }

    await this.tick(client);

    setInterval(() => void this.tick(client), ARRIVAL_CHECK_INTERVAL_MS).unref();
  }

  private async tick(client: Client<true>) {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      await TravelService.processArrivals(client);
    } catch (error) {
      this.container.logger.error(error);
    } finally {
      this.running = false;
    }
  }
}
