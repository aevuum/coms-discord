import { container } from "@sapphire/framework";
import { MessageFlags, type Client, type Message } from "discord.js";

import prisma from "../../../database/prisma.js";
import { TupperLocationBackfill } from "../../tupper/service/tupperLocationBackfill.js";
import {
  PROPHET_ACTIVE_DAYS,
  PROPHET_CATCH_UP_DAYS,
  PROPHET_CHANNEL_ID,
  PROPHET_DEBOUNCE_MS,
} from "../lib/prophetConfig.js";
import { ProphetContainer, type ProphetRecipient } from "../lib/prophetContainer.js";

type Issue = {
  id: string;
  url: string;
  createdAt: Date;
};

export class ProphetService {
  private static timer: NodeJS.Timeout | null = null;

  private static latest: Issue | null = null;

  public static isIssue(message: Message) {
    if (message.channelId !== PROPHET_CHANNEL_ID || message.system) {
      return false;
    }

    if (message.author.id === message.client.user.id) {
      return false;
    }

    return Boolean(message.content.trim() || message.attachments.size || message.embeds.length);
  }

  public static schedule(message: Message) {
    this.latest = { id: message.id, url: message.url, createdAt: message.createdAt };

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.timer = null;

      const issue = this.latest;
      this.latest = null;

      if (issue) {
        void this.deliver(message.client, issue).catch((error) => container.logger.error(error));
      }
    }, PROPHET_DEBOUNCE_MS);
  }

  public static async catchUp(client: Client<true>) {
    const restored = await TupperLocationBackfill.run(client);

    if (restored) {
      container.logger.info(`Restored last locations of ${restored} tuppers`);
    }

    const channel = await client.channels.fetch(PROPHET_CHANNEL_ID).catch(() => null);

    if (!channel?.isTextBased() || channel.isDMBased()) {
      return 0;
    }

    const messages = await channel.messages.fetch({ limit: 20 });
    const newest = [...messages.values()]
      .filter((message) => this.isIssue(message))
      .sort((left, right) => right.createdTimestamp - left.createdTimestamp)[0];

    if (!newest || Date.now() - newest.createdTimestamp > PROPHET_CATCH_UP_DAYS * 24 * 60 * 60 * 1000) {
      return 0;
    }

    const state = await prisma.prophetState.findUnique({ where: { guildId: newest.guildId! } });

    if (state?.lastIssueId === newest.id && state.deliveredCount > 0) {
      return 0;
    }

    return this.deliver(client, { id: newest.id, url: newest.url, createdAt: newest.createdAt });
  }

  public static async deliver(client: Client, issue: Issue) {
    const guildId = process.env.GUILD_ID ?? "";

    const since = new Date(Date.now() - PROPHET_ACTIVE_DAYS * 24 * 60 * 60 * 1000);

    const tuppers = await prisma.characterTupper.findMany({
      where: {
        lastChannelId: { not: null },
        lastUsedAt: { gte: since },
        character: { status: "ALIVE" },
      },
      include: { character: { include: { user: true } } },
      orderBy: { lastUsedAt: "desc" },
    });

    const byChannel = new Map<string, ProphetRecipient[]>();

    for (const tupper of tuppers) {
      const channelId = tupper.lastChannelId!;

      if (channelId === PROPHET_CHANNEL_ID) {
        continue;
      }

      const recipients = byChannel.get(channelId) ?? [];

      recipients.push({ name: tupper.character.rpName, ownerId: tupper.character.user.discordId });
      byChannel.set(channelId, recipients);
    }

    let delivered = 0;

    for (const [channelId, recipients] of byChannel) {
      const channel = await client.channels.fetch(channelId).catch(() => null);

      if (!channel?.isSendable() || channel.isDMBased()) {
        continue;
      }

      if (channel.isThread() && channel.locked) {
        continue;
      }

      const sent = await channel
        .send({
          flags: MessageFlags.IsComponentsV2,
          components: [ProphetContainer.delivery(recipients, issue.url, issue.createdAt)],
          allowedMentions: { users: [...new Set(recipients.map((recipient) => recipient.ownerId))] },
        })
        .catch((error) => {
          container.logger.error(error);
          return null;
        });

      if (sent) {
        delivered += recipients.length;
      }
    }

    await prisma.prophetState.upsert({
      where: { guildId },
      create: { guildId, lastIssueId: issue.id, deliveredAt: new Date(), deliveredCount: delivered },
      update: { lastIssueId: issue.id, deliveredAt: new Date(), deliveredCount: delivered },
    });

    container.logger.info(`Daily Prophet delivered to ${delivered} characters in ${byChannel.size} channels`);

    return delivered;
  }
}
