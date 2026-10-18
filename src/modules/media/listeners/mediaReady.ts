import { Listener } from "@sapphire/framework";

import { TupperService } from "../../tupper/service/tupperService.js";
import { MediaService } from "../service/mediaService.js";

const REFRESH_INTERVAL_MS = 60 * 60 * 1000;

export class MediaReadyListener extends Listener {
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

  public override async run() {
    try {
      const migrated = await MediaService.migrateLegacy();

      if (migrated) {
        this.container.logger.info(`Moved ${migrated} images into storage`);
      }
    } catch (error) {
      this.container.logger.error(error);
    }

    await this.tick();

    setInterval(() => void this.tick(), REFRESH_INTERVAL_MS).unref();
  }

  private async tick() {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      const refreshed = await MediaService.refreshExpiring();

      if (refreshed) {
        await TupperService.loadCache();

        this.container.logger.info(`Refreshed ${refreshed} image links`);
      }
    } catch (error) {
      this.container.logger.error(error);
    } finally {
      this.running = false;
    }
  }
}
