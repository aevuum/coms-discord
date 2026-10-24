import {
  DiscordAPIError,
  RESTJSONErrorCodes,
  type Client,
  type ForumChannel,
  type MediaChannel,
  type Message,
  type NewsChannel,
  type StageChannel,
  type TextChannel,
  type VoiceChannel,
  type Webhook,
  type WebhookMessageCreateOptions,
} from "discord.js";

import { WebhookCache } from "../cache/webhookCache.js";

type WebhookParent =
  | TextChannel
  | NewsChannel
  | VoiceChannel
  | StageChannel
  | ForumChannel
  | MediaChannel;

type WebhookTarget = {
  parent: WebhookParent;
  threadId?: string;
};

export type ProxyPayload = Omit<WebhookMessageCreateOptions, "threadId">;

export class WebhookService {
  private static readonly WEBHOOK_NAME = "TupperBot";

  private static readonly byIdCache = new Map<string, Webhook>();

  public static async send(
    channel: Message<true>["channel"],
    payload: ProxyPayload,
  ) {
    const target = this.resolveTarget(channel);

    if (!target) {
      return null;
    }

    try {
      return await this.sendTo(target, payload);
    } catch (error) {
      if (
        !(error instanceof DiscordAPIError) ||
        error.code !== RESTJSONErrorCodes.UnknownWebhook
      ) {
        throw error;
      }

      WebhookCache.remove(target.parent.id);

      return this.sendTo(target, payload);
    }
  }

  private static async sendTo(target: WebhookTarget, payload: ProxyPayload) {
    const webhook = await this.get(target.parent);

    return webhook.send({
      ...payload,
      threadId: target.threadId,
    });
  }

  private static resolveTarget(
    channel: Message<true>["channel"],
  ): WebhookTarget | null {
    if (channel.isThread()) {
      return channel.parent
        ? {
            parent: channel.parent,
            threadId: channel.id,
          }
        : null;
    }

    return {
      parent: channel,
    };
  }

  public static async editMessage(
    client: Client,
    webhookId: string,
    messageId: string,
    threadId: string | null,
    content: string,
  ) {
    const webhook = await this.byId(client, webhookId);

    return webhook.editMessage(messageId, { content, threadId: threadId ?? undefined });
  }

  public static async deleteMessage(client: Client, webhookId: string, messageId: string, threadId: string | null) {
    const webhook = await this.byId(client, webhookId);

    await webhook.deleteMessage(messageId, threadId ?? undefined);
  }

  private static async byId(client: Client, webhookId: string) {
    const cached = this.byIdCache.get(webhookId);

    if (cached) {
      return cached;
    }

    const webhook = await client.fetchWebhook(webhookId);

    if (!webhook.token) {
      throw new Error(`Webhook ${webhookId} has no token`);
    }

    this.byIdCache.set(webhookId, webhook);

    return webhook;
  }

  private static async get(parent: WebhookParent): Promise<Webhook> {
    const cached = WebhookCache.get(parent.id);

    if (cached) {
      return cached;
    }

    const webhooks = await parent.fetchWebhooks();

    let webhook = webhooks.find(
      (item) => item.owner?.id === parent.client.user.id && item.token,
    );

    if (!webhook) {
      webhook = await parent.createWebhook({
        name: this.WEBHOOK_NAME,
      });
    }

    WebhookCache.set(parent.id, webhook);

    return webhook;
  }
}
