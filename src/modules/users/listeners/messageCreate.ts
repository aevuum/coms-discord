import { Listener } from "@sapphire/framework";
import type { Message } from "discord.js";
import { UserRepository } from "../repositories/userRepository.js";

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
    if (message.author.bot || !message.guild) return;

    try {
      await UserRepository.incrementMessageCount(message.author.id);
    } catch (error) {
      this.container.logger.error("Ошибка при инкременте сообщений:", error);
    }
  }
}
