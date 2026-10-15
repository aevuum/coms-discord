import { Listener } from "@sapphire/framework";

import { GifService } from "../service/gifService.js";
import { SpellService } from "../service/spellService.js";

export class SpellReadyListener extends Listener {
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
      const count = await SpellService.loadCache();

      this.container.logger.info(`Loaded ${count} spells into cache`);

      if (!GifService.isEnabled()) {
        this.container.logger.warn(
          "GIPHY_API_KEY is not set: spells without an image URL will be sent without GIFs",
        );
      }
    } catch (error) {
      this.container.logger.error(error);
    }
  }
}
