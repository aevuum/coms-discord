import type { Client } from "discord.js";

export class EmojiAccess {
  public static async canUse(client: Client, emojiId: string) {
    if (client.emojis.cache.has(emojiId)) {
      return true;
    }

    const application = client.application;

    if (!application) {
      return false;
    }

    if (application.emojis.cache.has(emojiId)) {
      return true;
    }

    const emojis = await application.emojis.fetch().catch(() => null);

    return Boolean(emojis?.has(emojiId));
  }
}
