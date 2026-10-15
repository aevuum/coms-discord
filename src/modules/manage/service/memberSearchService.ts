import { container } from "@sapphire/framework";

import type { GuildMember } from "discord.js";

import type { MemberOption } from "../types/manage.js";

export class MemberSearchService {
  private static readonly LIMIT = 25;

  public static async search(query: string): Promise<MemberOption[]> {
    const guild = await this.getGuild();

    const text = query.trim();

    if (!guild || text.length < 2) {
      return [];
    }

    const id = text.match(/^<@!?(\d{17,20})>$|^(\d{17,20})$/);

    if (id) {
      const member = await guild.members
        .fetch(id[1] ?? id[2])
        .catch(() => null);

      return member ? [this.toOption(member)] : [];
    }

    const members = await guild.members
      .search({ query: text.replace(/^@/, ""), limit: this.LIMIT })
      .catch(() => null);

    return members ? [...members.values()].map((member) => this.toOption(member)) : [];
  }

  public static async getMember(discordId: string) {
    const guild = await this.getGuild();

    const member = guild
      ? await guild.members.fetch(discordId).catch(() => null)
      : null;

    return member ? this.toOption(member) : null;
  }

  private static async getGuild() {
    const guildId = process.env.GUILD_ID;

    if (!guildId) {
      return null;
    }

    return container.client.guilds.fetch(guildId).catch(() => null);
  }

  private static toOption(member: GuildMember): MemberOption {
    return {
      id: member.id,
      displayName: member.displayName,
      username: member.user.username,
    };
  }
}
