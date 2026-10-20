import { container } from "@sapphire/framework";
import {
  ChannelType,
  type Client,
  type Guild,
  type TextBasedChannel,
} from "discord.js";

import prisma from "../../../database/prisma.js";

const MESSAGES_PER_CHANNEL = 50;
const ARCHIVED_THREADS_PER_FORUM = 50;

export class TupperLocationBackfill {
  public static async run(client: Client<true>) {
    const missing = await prisma.characterTupper.findMany({
      where: { lastChannelId: null },
      select: { characterId: true, name: true },
    });

    if (!missing.length) {
      return 0;
    }

    const guild = client.guilds.cache.get(process.env.GUILD_ID ?? "");

    if (!guild) {
      return 0;
    }

    const wanted = new Map(missing.map((tupper) => [tupper.name.toLowerCase(), tupper.characterId]));
    const found = new Map<string, { channelId: string; at: Date }>();

    for (const channel of await this.channels(guild)) {
      const messages = await channel.messages.fetch({ limit: MESSAGES_PER_CHANNEL }).catch(() => null);

      for (const message of messages?.values() ?? []) {
        if (!message.webhookId || message.applicationId !== client.user.id) {
          continue;
        }

        const characterId = wanted.get(message.author.username.toLowerCase());

        if (!characterId) {
          continue;
        }

        const current = found.get(characterId);

        if (!current || current.at < message.createdAt) {
          found.set(characterId, { channelId: message.channelId, at: message.createdAt });
        }
      }
    }

    for (const [characterId, location] of found) {
      await prisma.characterTupper.updateMany({
        where: { characterId, lastChannelId: null },
        data: { lastChannelId: location.channelId, lastUsedAt: location.at },
      });
    }

    return found.size;
  }

  private static async channels(guild: Guild) {
    const result: TextBasedChannel[] = [];

    for (const channel of guild.channels.cache.values()) {
      if (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) {
        result.push(channel);
      }
    }

    const active = await guild.channels.fetchActiveThreads().catch(() => null);

    for (const thread of active?.threads.values() ?? []) {
      result.push(thread);
    }

    for (const channel of guild.channels.cache.values()) {
      if (
        channel.type !== ChannelType.GuildForum &&
        channel.type !== ChannelType.GuildText &&
        channel.type !== ChannelType.GuildAnnouncement
      ) {
        continue;
      }

      const archived = await channel.threads
        .fetchArchived({ limit: ARCHIVED_THREADS_PER_FORUM })
        .catch(() => null);

      for (const thread of archived?.threads.values() ?? []) {
        result.push(thread);
      }
    }

    container.logger.info(`Tupper location backfill scans ${result.length} channels`);

    return result;
  }
}
