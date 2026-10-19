import { Listener } from "@sapphire/framework";
import type { AnyThreadChannel } from "discord.js";

import { APPLICATION_TEMPLATES_FORUM_ID } from "../lib/applicationConfig.js";
import { ApplicationTemplates } from "../service/applicationTemplates.js";

export class ApplicationThreadUpdateListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: "threadUpdate",
    });
  }

  public override run(_oldThread: AnyThreadChannel, newThread: AnyThreadChannel) {
    if (newThread.parentId === APPLICATION_TEMPLATES_FORUM_ID) {
      ApplicationTemplates.clear();
    }
  }
}
