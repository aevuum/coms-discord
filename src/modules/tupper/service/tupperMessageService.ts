import { Message } from "discord.js";
import { TupperCache } from "../cache/tupperCache.js";
import { WebhookService } from "./webhookService.js";

export class TupperMessageService {
  public static async handle(message: Message): Promise<boolean> {
    if (message.author.bot || !message.guild) {
      return false;
    }

    const parsed = TupperCache.find(message.content);

    if (!parsed) {
      return false;
    }

    const { tupper, content } = parsed;

    if (!content.length) {
      return false;
    }

    const webhook = await WebhookService.get(message.channel);

    await webhook.send({
      content,

      username: tupper.name,

      avatarURL: tupper.character.avatarUrl ?? undefined,
    });

    await message.delete().catch(() => {});

    return true;
  }
}
