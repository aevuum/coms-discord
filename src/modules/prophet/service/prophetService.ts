import { container } from "@sapphire/framework";
import { MessageFlags, type Client, type Message } from "discord.js";

import prisma from "../../../database/prisma.js";
import {
  PROPHET_ACTIVE_DAYS,
  PROPHET_CHANNEL_ID,
  PROPHET_DEBOUNCE_MS,
} from "../lib/prophetConfig.js";
import { ProphetContainer, type ProphetRecipient } from "../lib/prophetContainer.js";

export class ProphetService {
  private static timer: NodeJS.Timeout | null = null;

  private static latest: { url: string; createdAt: Date } | null = null;

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
    this.latest = { url: message.url, createdAt: message.createdAt };

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.timer = null;

      const issue = this.latest;
      this.latest = null;

      if (issue) {
        void this.deliver(message.client, issue.url, issue.createdAt).catch((error) =>
          container.logger.error(error),
        );
      }
    }, PROPHET_DEBOUNCE_MS);
  }

  public static async deliver(client: Client, issueUrl: string, publishedAt: Date) {
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

      if (channel.isThread() && (channel.archived || channel.locked)) {
        continue;
      }

      const sent = await channel
        .send({
          flags: MessageFlags.IsComponentsV2,
          components: [ProphetContainer.delivery(recipients, issueUrl, publishedAt)],
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

    container.logger.info(`Daily Prophet delivered to ${delivered} characters in ${byChannel.size} channels`);

    return delivered;
  }
}
