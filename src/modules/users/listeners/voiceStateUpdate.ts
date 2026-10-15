import { Listener } from "@sapphire/framework";
import type { VoiceState } from "discord.js";

import { VoiceTracker } from "../lib/voiceTracker.js";

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
    const wasCounted = VoiceTracker.isCounted(oldState);
    const isCounted = VoiceTracker.isCounted(newState);

    try {
      if (isCounted) {
        VoiceTracker.start(newState.id);
      } else if (wasCounted) {
        await VoiceTracker.stop(oldState.id);
      }
    } catch (error) {
      this.container.logger.error(error);
    }
  }
}
