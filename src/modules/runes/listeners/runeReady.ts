import { Listener } from "@sapphire/framework";

import { RuneRegistry } from "../service/runeRegistry.js";

export class RuneReadyListener extends Listener {
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
      const count = await RuneRegistry.load();

      this.container.logger.info(`Loaded ${count} runes`);
    } catch (error) {
      this.container.logger.error(error);
    }
  }
}
