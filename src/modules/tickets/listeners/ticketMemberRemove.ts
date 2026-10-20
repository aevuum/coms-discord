import { Listener } from "@sapphire/framework";
import type { GuildMember, PartialGuildMember } from "discord.js";

import { TicketService } from "../service/ticketService.js";

export class TicketMemberRemoveListener extends Listener {
  public constructor(
    context: Listener.LoaderContext,
    options: Listener.Options,
  ) {
    super(context, {
      ...options,
      event: "guildMemberRemove",
    });
  }

  public override async run(member: GuildMember | PartialGuildMember) {
    if (member.guild.id !== process.env.GUILD_ID) {
      return;
    }

    try {
      const removed = await TicketService.closeForLeaver(member.guild, member.id);

      if (removed) {
        this.container.logger.info(`Removed ${removed} tickets of ${member.id} who left the server`);
      }
    } catch (error) {
      this.container.logger.error(error);
    }
  }
}
