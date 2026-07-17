import { WebhookClient } from "discord.js";

export class WebhookCache {
  private static cache = new Map<string, WebhookClient>();

  public static get(channelId: string) {
    return this.cache.get(channelId);
  }

  public static set(channelId: string, webhook: WebhookClient) {
    this.cache.set(channelId, webhook);
  }

  public static remove(channelId: string) {
    this.cache.delete(channelId);
  }

  public static clear() {
    this.cache.clear();
  }
}
