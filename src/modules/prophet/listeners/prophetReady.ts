import { Listener } from "@sapphire/framework";
import type { Client } from "discord.js";

import { ProphetService } from "../service/prophetService.js";

export class ProphetReadyListener extends Listener {
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
      await ProphetService.catchUp(client);
    } catch (error) {
      this.container.logger.error(error);
    }
  }
}
