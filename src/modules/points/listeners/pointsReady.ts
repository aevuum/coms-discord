import { Listener } from "@sapphire/framework";

import type { Client } from "discord.js";

import { PointsBoard } from "../service/pointsBoard.js";

export class PointsReadyListener extends Listener {
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
    await PointsBoard.refreshAll(client).catch((error) => this.container.logger.error(error));
  }
}
