import { container } from "@sapphire/framework";
import type { Message } from "discord.js";

import { TupperCache } from "../cache/tupperCache.js";
import { MessageFormatter } from "../lib/messageFormatter.js";
import { MessageSplitter } from "../lib/messageSplitter.js";
import { TupperRepository } from "../repositories/tupperRepository.js";
import { WebhookService } from "./webhookService.js";
import { SpellCastService } from "../../spells/service/spellCastService.js";
import { EmojiAccess } from "../../../lib/emojiAccess.js";
import { Storage } from "../../../lib/storage.js";

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

    const text = await EmojiAccess.resolveShortcodes(message.client, message.guildId, content);

    const formatted = await MessageFormatter.format(message, text);

    const chunks = MessageSplitter.split(formatted, MAX_CONTENT_LENGTH);

    const payload = (content: string | undefined, withFiles: boolean) => ({
      content,
      username: tupper.name,
      avatarURL:
        Storage.media(tupper.character.avatarPath, tupper.character.avatarUrl) ?? undefined,
      files: withFiles ? files : [],
      allowedMentions: {
        parse: ["users" as const],
      },
    });

    let sent: Message | null;

    try {
      sent = await WebhookService.send(
        message.channel,
        payload(chunks[0], chunks.length <= 1),
      );

      if (!sent) {
        return false;
      }
    } catch (error) {
      container.logger.error(error);
      return false;
    }

    for (const [index, chunk] of chunks.slice(1).entries()) {
      await WebhookService.send(
        message.channel,
        payload(chunk, index === chunks.length - 2),
      ).catch((error) => container.logger.error(error));
    }

    await message.delete().catch(() => {});

    await TupperRepository.markUsed(tupper.character.id, message.channelId).catch((error) =>
      container.logger.error(error),
    );

    if (content.length) {
      await SpellCastService.handle(tupper.character.id, content, sent).catch(
        (error) => container.logger.error(error),
      );
    }

    return true;
  }
}
