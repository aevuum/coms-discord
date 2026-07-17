import {
  ChannelType,
  TextChannel,
  NewsChannel,
  ForumChannel,
  Webhook,
} from "discord.js";

export class WebhookManager {
  private static cache = new Map<string, Webhook>();

  public static async get(channel: TextChannel): Promise<Webhook> {
    const cached = this.cache.get(channel.id);

    if (cached) {
      return cached;
    }

    const hooks = await channel.fetchWebhooks();

    let hook = hooks.find((x) => x.owner?.id === channel.client.user!.id);

    if (!hook) {
      hook = await channel.createWebhook({
        name: "Roleplay",
      });
    }

    this.cache.set(channel.id, hook);

    return hook;
  }
}
