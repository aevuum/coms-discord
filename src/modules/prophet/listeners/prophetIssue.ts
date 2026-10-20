import { Listener } from "@sapphire/framework";
import type { Message } from "discord.js";

import { ProphetService } from "../service/prophetService.js";

export class ProphetIssueListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: "messageCreate",
    });
  }

  public override run(message: Message) {
    if (ProphetService.isIssue(message)) {
      ProphetService.schedule(message);
    }
  }
}
