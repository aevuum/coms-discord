import { Listener } from "@sapphire/framework";

import { StipendService } from "../service/stipendService.js";

const CHECK_INTERVAL_MS = 10 * 60 * 1000;

export class StipendSchedulerListener extends Listener {
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
    await this.tick();

    setInterval(() => void this.tick(), CHECK_INTERVAL_MS).unref();
  }

  private async tick() {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      await StipendService.runDue();
    } catch (error) {
      this.container.logger.error(error);
    } finally {
      this.running = false;
    }
  }
}
