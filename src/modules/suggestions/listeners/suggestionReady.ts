import { Listener } from "@sapphire/framework";
import type { Client } from "discord.js";

import { SuggestionService } from "../service/suggestionService.js";

export class SuggestionReadyListener extends Listener {
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
    try {
      const { message, created } = await SuggestionService.syncPanel(client);

      this.container.logger.info(`Suggestion panel ${created ? "posted" : "updated"}: ${message.id}`);
    } catch (error) {
      this.container.logger.error(error);
    }
  }
}
