import { Listener } from "@sapphire/framework";
import type { Message } from "discord.js";

import * as Repo from "../repositories/userRepository.js";
import { HalloweenService } from "../../halloween/service/halloweenService.js";
import { PointsService } from "../../points/service/pointsService.js";
import { TupperMessageService } from "../../tupper/service/tupperMessageService.js";

export class MessageCreateListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: "messageCreate",
    });
  }

  public override async run(message: Message) {
    if (message.author.bot || !message.guild) {
      return;
    }

    const handled = await TupperMessageService.handle(message);

    if (handled || message.guildId !== process.env.GUILD_ID) {
      return;
    }

    await PointsService.handleMessage(message).catch((error) => this.container.logger.error(error));

    HalloweenService.noteActivity(message);
    await HalloweenService.handleReply(message).catch((error) => this.container.logger.error(error));

    await Repo.UserRepository.incrementMessageCount(message.author.id);
  }
}
