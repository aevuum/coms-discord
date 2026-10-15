import { container } from "@sapphire/framework";
import type { Message } from "discord.js";

import { TupperCache } from "../cache/tupperCache.js";
import { MessageFormatter } from "../lib/messageFormatter.js";
import { WebhookService } from "./webhookService.js";
import { SpellCastService } from "../../spells/service/spellCastService.js";

const MAX_CONTENT_LENGTH = 2000;

export class TupperMessageService {
  public static async handle(message: Message): Promise<boolean> {
    if (message.author.bot || !message.inGuild()) {
      return false;
    }

    const parsed = TupperCache.find(message.content);

    if (!parsed) {
      return false;
    }

    const { tupper, content } = parsed;

    if (tupper.character.user.discordId !== message.author.id) {
      return false;
    }

    const files = message.attachments.map((attachment) => ({
      attachment: attachment.url,
      name: attachment.name,
    }));

    if (!content.length && !files.length) {
      return false;
    }

    const formatted = await MessageFormatter.format(message, content);

    let sent: Message | null;

    try {
      sent = await WebhookService.send(message.channel, {
        content:
          (formatted.length <= MAX_CONTENT_LENGTH ? formatted : content) ||
          undefined,
        username: tupper.name,
        avatarURL: tupper.character.avatarUrl ?? undefined,
        files,
        allowedMentions: {
          parse: ["users"],
        },
      });

      if (!sent) {
        return false;
      }
    } catch (error) {
      container.logger.error(error);
      return false;
    }

    await message.delete().catch(() => {});

    if (content.length) {
      await SpellCastService.handle(tupper.character.id, content, sent).catch(
        (error) => container.logger.error(error),
      );
    }

    return true;
  }
}
