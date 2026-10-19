import { Listener } from "@sapphire/framework";
import type { Client } from "discord.js";

import { ApplicationService } from "../service/applicationService.js";
import { ApplicationTemplates } from "../service/applicationTemplates.js";

export class ApplicationReadyListener extends Listener {
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
      const { message, created } = await ApplicationService.syncPanel(client);

      this.container.logger.info(
        `Staff application panel ${created ? "posted" : "updated"}: ${message.id}`,
      );

      await ApplicationTemplates.warm(client);
    } catch (error) {
      this.container.logger.error(error);
    }
  }
}
