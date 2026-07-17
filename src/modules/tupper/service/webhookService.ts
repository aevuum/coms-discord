import { TextChannel, WebhookClient } from "discord.js";

import { WebhookCache } from "../cache/webhookCache.js";

export class WebhookService {
  public static async get(channel: TextChannel): Promise<WebhookClient> {
    const cached = WebhookCache.get(channel.id);

    if (cached) {
      return cached;
    }

    const webhooks = await channel.fetchWebhooks();

    let webhook = webhooks.find((item) => item.name === "TupperBot");

    if (!webhook) {
      webhook = await channel.createWebhook({
        name: "TupperBot",
      });
    }

    const client = new WebhookClient({
      id: webhook.id,
      token: webhook.token!,
    });

    WebhookCache.set(channel.id, client);

    return client;
  }
}
