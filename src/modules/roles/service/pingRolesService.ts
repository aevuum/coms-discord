import {
  ComponentType,
  MessageFlags,
  type Client,
  type GuildMember,
  type Message,
  type TopLevelComponent,
} from "discord.js";

import {
  PING_ROLES,
  PING_ROLES_CHANNEL_ID,
  PingRolesCustomIds,
} from "../lib/pingRoles.js";
import { PingRolesContainer } from "../lib/pingRolesContainer.js";

export class PingRolesService {
  public static async apply(member: GuildMember, wanted: string[]) {
    const allowed = new Set(PING_ROLES.map((role) => role.id));

    const selected = new Set(wanted.filter((id) => allowed.has(id)));

    const added = [...selected].filter((id) => !member.roles.cache.has(id));

    const removed = [...allowed].filter(
      (id) => !selected.has(id) && member.roles.cache.has(id),
    );

    if (added.length) {
      await member.roles.add(added, "Выбор пинг-ролей");
    }

    if (removed.length) {
      await member.roles.remove(removed, "Выбор пинг-ролей");
    }

    return {
      added,
      removed,
      current: [...allowed].filter((id) => selected.has(id)),
    };
  }

  /**
   * Updates the existing panel in the channel to the current layout,
   * or posts a new one when it is missing.
   */
  public static async syncPanel(client: Client<true>) {
    const channel = await client.channels.fetch(PING_ROLES_CHANNEL_ID);

    if (!channel?.isSendable() || !channel.isTextBased()) {
      throw new Error(`Ping roles channel ${PING_ROLES_CHANNEL_ID} is not a text channel`);
    }

    const payload = {
      flags: MessageFlags.IsComponentsV2 as const,
      components: [PingRolesContainer.panel()],
      allowedMentions: { parse: [] },
    };

    const messages = await channel.messages.fetch({ limit: 50 });

    const existing = messages.find(
      (message) =>
        message.author.id === client.user.id && this.isPanel(message),
    );

    if (existing) {
      await existing.edit(payload);

      return { message: existing, created: false };
    }

    return { message: await channel.send(payload), created: true };
  }

  private static isPanel(message: Message) {
    return message.components.some((component) =>
      this.hasCustomId(component, PingRolesCustomIds.select),
    );
  }

  private static hasCustomId(
    component: TopLevelComponent | { type: ComponentType },
    customId: string,
  ): boolean {
    const data = component as {
      customId?: string;
      components?: { type: ComponentType }[];
    };

    if (data.customId === customId) {
      return true;
    }

    return (data.components ?? []).some((child) =>
      this.hasCustomId(child, customId),
    );
  }
}
