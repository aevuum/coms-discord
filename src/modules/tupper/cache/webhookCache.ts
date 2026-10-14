import type { Webhook } from "discord.js";

export class WebhookCache {
  private static cache = new Map<string, Webhook>();

  public static get(channelId: string) {
    return this.cache.get(channelId);
  }

  public static set(channelId: string, webhook: Webhook) {
    this.cache.set(channelId, webhook);
  }

  public static remove(channelId: string) {
    this.cache.delete(channelId);
  }

  public static clear() {
    this.cache.clear();
  }
}
