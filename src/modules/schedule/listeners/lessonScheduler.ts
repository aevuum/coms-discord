import { Listener } from "@sapphire/framework";
import type { Client } from "discord.js";

import { GradeBoardService } from "../service/gradeBoardService.js";
import { LessonNotifier } from "../service/lessonNotifier.js";

const CHECK_INTERVAL_MS = 30 * 1000;
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const BOARD_INTERVAL_MS = 15 * 60 * 1000;

export class LessonSchedulerListener extends Listener {
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
    await this.prune();
    await this.tick(client);

    setInterval(() => void this.tick(client), CHECK_INTERVAL_MS).unref();
    setInterval(() => void this.prune(), PRUNE_INTERVAL_MS).unref();

    await this.refreshBoards(client);
    setInterval(() => void this.refreshBoards(client), BOARD_INTERVAL_MS).unref();
  }

  private async tick(client: Client<true>) {
    if (this.running) {
      return;
    }

    this.running = true;

    try {
      const sent = await LessonNotifier.tick(client);

      if (sent) {
        this.container.logger.info(`Sent ${sent} lesson notifications`);
      }
    } catch (error) {
      this.container.logger.error(error);
    } finally {
      this.running = false;
    }
  }

  private async refreshBoards(client: Client<true>) {
    await GradeBoardService.refreshAll(client).catch((error) => this.container.logger.error(error));
  }

  private async prune() {
    await LessonNotifier.prune().catch((error) => this.container.logger.error(error));
  }
}
