import {
  DiscordAPIError,
  RESTJSONErrorCodes,
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
