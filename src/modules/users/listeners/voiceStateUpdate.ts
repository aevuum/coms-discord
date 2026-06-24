import { Listener } from "@sapphire/framework";
import type { VoiceState } from "discord.js";
import { UserRepository } from "../repositories/userRepository.js";

const voiceSessions = new Map<string, number>();

export class VoiceStateUpdateListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: "voiceStateUpdate",
    });
  }

  public override async run(oldState: VoiceState, newState: VoiceState) {
    if (oldState.member?.user.bot) return;

    const memberId = oldState.id;
    const now = Math.floor(Date.now() / 1000);

    const joinedVoice = !oldState.channelId && newState.channelId;
    const leftVoice = oldState.channelId && !newState.channelId;
    const switchedChannel =
      oldState.channelId &&
      newState.channelId &&
      oldState.channelId !== newState.channelId;

    if (joinedVoice) {
      voiceSessions.set(memberId, now);
      return;
    }

    if (leftVoice || switchedChannel) {
      const joinTime = voiceSessions.get(memberId);

      if (joinTime !== undefined) {
        const timeSpent = now - joinTime;

        await UserRepository.addVoiceSeconds(memberId, timeSpent);
      }
    }

    if (switchedChannel) {
      voiceSessions.set(memberId, now);
    }
  }
}
