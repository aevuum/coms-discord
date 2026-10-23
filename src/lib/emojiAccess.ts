import type { Client, Emoji } from "discord.js";

const SHORTCODE = /(<a?)?:([\w~]{2,32}):(\d{17,20}>)?/g;

export class EmojiAccess {
  public static async resolveShortcodes(client: Client, guildId: string | null, text: string) {
    if (!text.includes(":")) {
      return text;
    }

    const names = new Set<string>();

    for (const match of text.matchAll(SHORTCODE)) {
      if (!match[1] && !match[3]) {
        names.add(match[2].toLowerCase());
      }
    }

    if (!names.size) {
      return text;
    }

    const application = client.application;
    const appEmojis = application
      ? application.emojis.cache.size
        ? application.emojis.cache
        : await application.emojis.fetch().catch(() => application.emojis.cache)
      : null;

    const found = new Map<string, string>();

    const pick = (emojis: Iterable<Emoji>) => {
      for (const emoji of emojis) {
        const name = emoji.name?.toLowerCase();

        if (name && names.has(name) && !found.has(name) && emoji.id) {
          found.set(name, `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`);
        }
      }
    };

    if (guildId) {
      pick(client.guilds.cache.get(guildId)?.emojis.cache.values() ?? []);
    }

    pick(appEmojis?.values() ?? []);
    pick(client.emojis.cache.values());

    if (!found.size) {
      return text;
    }

    return text.replace(SHORTCODE, (whole, open, name, close) =>
      open || close ? whole : (found.get(name.toLowerCase()) ?? whole),
    );
  }

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
