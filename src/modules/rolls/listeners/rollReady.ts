import { Listener } from "@sapphire/framework";

import { RollService } from "../service/rollService.js";

export class RollReadyListener extends Listener {
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
      const created = await RollService.seed();

      if (created) {
        this.container.logger.info(`Seeded ${created} race and trait entries`);
      }
    } catch (error) {
      this.container.logger.error(error);
    }
  }
}
