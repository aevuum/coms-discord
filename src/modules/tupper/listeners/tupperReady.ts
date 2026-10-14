import { Listener } from "@sapphire/framework";

import { TupperService } from "../service/tupperService.js";

export class TupperReadyListener extends Listener {
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
      const count = await TupperService.loadCache();

      this.container.logger.info(`Loaded ${count} tuppers into cache`);
    } catch (error) {
      this.container.logger.error(error);
    }
  }
}
