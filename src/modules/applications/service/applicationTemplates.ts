import {
  ChannelType,
  type APIMessageTopLevelComponent,
  type Client,
  type ForumChannel,
  type Guild,
  type Message,
} from "discord.js";

import {
  APPLICATION_TEMPLATE_CACHE_MS,
  APPLICATION_TEMPLATES_FORUM_ID,
} from "../lib/applicationConfig.js";
import { TemplateParser } from "../lib/templateParser.js";
import {
  ApplicationError,
  type ApplicationQuestion,
  type ApplicationRole,
} from "../types/application.js";

export class ApplicationTemplates {
  private static cache = new Map<string, { createdAt: number; questions: ApplicationQuestion[] }>();

  public static async getForum(client: Client): Promise<ForumChannel> {
    const channel = await client.channels.fetch(APPLICATION_TEMPLATES_FORUM_ID);

    if (channel?.type !== ChannelType.GuildForum) {
      throw new Error(`Application templates channel ${APPLICATION_TEMPLATES_FORUM_ID} is not a forum`);
    }

    return channel;
  }

  public static async getRoles(client: Client): Promise<ApplicationRole[]> {
    const forum = await this.getForum(client);

    return forum.availableTags.map((tag) => {
      const custom = tag.emoji?.id ? client.emojis.cache.get(tag.emoji.id) : null;

      return {
        tagId: tag.id,
        name: tag.name,
        roleId: this.resolveRoleId(forum.guild, tag.name),
        emoji: custom?.name
          ? { id: custom.id, name: custom.name }
          : tag.emoji?.name
            ? { unicode: tag.emoji.name }
            : null,
      };
    });
  }

  public static async getRole(client: Client, tagId: string) {
    const role = (await this.getRoles(client)).find((entry) => entry.tagId === tagId);

    if (!role) {
      throw new ApplicationError("Набор на эту должность закрыт.");
    }

    return role;
  }

  public static async getQuestions(client: Client, tagId: string) {
    const cached = this.cache.get(tagId);

    if (cached && Date.now() - cached.createdAt < APPLICATION_TEMPLATE_CACHE_MS) {
      return cached.questions;
    }

    const forum = await this.getForum(client);
    const thread = await this.findThread(forum, tagId);

    if (!thread) {
      throw new ApplicationError("Шаблон для этой должности ещё не опубликован.");
    }

    const messages = await thread.messages.fetch({ limit: 20 });

    const questions = [...messages.values()]
      .reverse()
      .map((message) => TemplateParser.parse(this.text(message)))
      .find((parsed) => parsed.length > 0);

    if (!questions) {
      throw new ApplicationError("Не удалось прочитать шаблон этой должности. Сообщите администрации.");
    }

    this.cache.set(tagId, { createdAt: Date.now(), questions });

    return questions;
  }

  public static async warm(client: Client) {
    const roles = await this.getRoles(client);

    await Promise.all(roles.map((role) => this.getQuestions(client, role.tagId).catch(() => null)));
  }

  public static clear() {
    this.cache.clear();
  }

  private static resolveRoleId(guild: Guild, name: string) {
    const needle = name.trim().toLowerCase();

    return guild.roles.cache.find((role) => role.name.toLowerCase().includes(needle))?.id ?? null;
  }

  private static async findThread(forum: ForumChannel, tagId: string) {
    const active = await forum.threads.fetchActive();

    const found = active.threads.find(
      (thread) => thread.parentId === forum.id && thread.appliedTags.includes(tagId),
    );

    if (found) {
      return found;
    }

    const archived = await forum.threads.fetchArchived({ limit: 100 });

    return archived.threads.find((thread) => thread.appliedTags.includes(tagId)) ?? null;
  }

  private static text(message: Message) {
    const parts = [message.content];

    const collect = (component: unknown) => {
      if (!component || typeof component !== "object") {
        return;
      }

      const record = component as Record<string, unknown>;

      if (typeof record.content === "string") {
        parts.push(record.content);
      }

      for (const value of Object.values(record)) {
        if (Array.isArray(value)) {
          value.forEach(collect);
        } else if (value && typeof value === "object") {
          collect(value);
        }
      }
    };

    message.components
      .map((component) => component.toJSON() as APIMessageTopLevelComponent)
      .forEach(collect);

    return parts.join("\n");
  }
}
