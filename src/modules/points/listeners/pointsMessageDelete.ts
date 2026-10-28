import { Listener } from "@sapphire/framework";

import type { Message, PartialMessage } from "discord.js";

import { PointsService } from "../service/pointsService.js";

export class PointsMessageDeleteListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: "messageDelete",
    });
  }

  public override async run(message: Message | PartialMessage) {
    const reverted = await PointsService.revert(message.id).catch((error) => {
      this.container.logger.error(error);
      return [];
    });

    if (reverted.length) {
      this.container.logger.info(`Reverted house points of deleted message ${message.id}`);
    }
  }
}
