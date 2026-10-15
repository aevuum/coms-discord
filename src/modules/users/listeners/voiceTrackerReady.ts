import { Listener } from "@sapphire/framework";
import type { Client } from "discord.js";

import { VOICE_FLUSH_INTERVAL_MS, VoiceTracker } from "../lib/voiceTracker.js";

export class VoiceTrackerReadyListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: "clientReady",
      once: true,
    });
  }

  public override async run(client: Client<true>) {
    const guild = client.guilds.cache.get(process.env.GUILD_ID ?? "");

    let resumed = 0;

    for (const state of guild?.voiceStates.cache.values() ?? []) {
      if (VoiceTracker.isCounted(state)) {
        VoiceTracker.start(state.id);
        resumed++;
      }
    }

    this.container.logger.info(`Resumed ${resumed} voice sessions`);

    setInterval(() => {
      VoiceTracker.flush().catch((error) =>
        this.container.logger.error(error),
      );
    }, VOICE_FLUSH_INTERVAL_MS);
  }
}
