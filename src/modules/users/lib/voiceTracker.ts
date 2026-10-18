import type { VoiceState } from "discord.js";

import { UserRepository } from "../repositories/userRepository.js";

export const VOICE_FLUSH_INTERVAL_MS = 60_000;

export class VoiceTracker {
  private static readonly sessions = new Map<string, number>();

  public static isCounted(state: VoiceState) {
    return Boolean(
      state.channelId &&
        state.guild.id === process.env.GUILD_ID &&
        !state.member?.user.bot &&
        state.channelId !== state.guild.afkChannelId,
    );
  }

  public static start(discordId: string) {
    if (!this.sessions.has(discordId)) {
      this.sessions.set(discordId, Date.now());
    }
  }

  public static async stop(discordId: string) {
    const startedAt = this.sessions.get(discordId);

    this.sessions.delete(discordId);

    if (startedAt !== undefined) {
      await this.credit(discordId, Date.now() - startedAt);
    }
  }

  public static pending(discordId: string) {
    const startedAt = this.sessions.get(discordId);

    return startedAt === undefined
      ? 0
      : Math.floor((Date.now() - startedAt) / 1000);
  }

  public static async flush() {
    const now = Date.now();

    for (const [discordId, startedAt] of this.sessions) {
      const seconds = Math.floor((now - startedAt) / 1000);

      if (seconds <= 0) {
        continue;
      }

      this.sessions.set(discordId, startedAt + seconds * 1000);

      await UserRepository.addVoiceSeconds(discordId, seconds);
    }
  }

  private static async credit(discordId: string, ms: number) {
    const seconds = Math.floor(ms / 1000);

    if (seconds > 0) {
      await UserRepository.addVoiceSeconds(discordId, seconds);
    }
  }
}
