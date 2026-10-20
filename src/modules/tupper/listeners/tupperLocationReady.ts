import { Listener } from "@sapphire/framework";
import type { Client } from "discord.js";

import { TupperLocationBackfill } from "../service/tupperLocationBackfill.js";

export class TupperLocationReadyListener extends Listener {
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
      const restored = await TupperLocationBackfill.run(client);

      if (restored) {
        this.container.logger.info(`Restored last locations of ${restored} tuppers`);
      }
    } catch (error) {
      this.container.logger.error(error);
    }
  }
}
