import {
  MessageFlags,
  ThreadAutoArchiveDuration,
  type Client,
  type GuildMember,
  type Message,
} from "discord.js";

import type { Suggestion } from "../../../database/generated/prisma/client.js";

import { ApplicationService } from "../../applications/service/applicationService.js";
import {
  SUGGESTION_BOARD_CHANNEL_ID,
  SUGGESTION_CATEGORIES,
  SUGGESTION_COOLDOWN_MS,
  SUGGESTION_PANEL_CHANNEL_ID,
  SuggestionAction,
  SuggestionCustomIds,
} from "../lib/suggestionConfig.js";
import { SuggestionContainer } from "../lib/suggestionContainer.js";
import { SuggestionRepository } from "../repositories/suggestionRepository.js";
import { SuggestionError, type SuggestionInput } from "../types/suggestion.js";

export class SuggestionService {
  public static async syncPanel(client: Client<true>) {
    const channel = await client.channels.fetch(SUGGESTION_PANEL_CHANNEL_ID);

    if (!channel?.isSendable() || !channel.isTextBased()) {
      throw new Error(`Suggestion panel channel ${SUGGESTION_PANEL_CHANNEL_ID} is not a text channel`);
    }

    const payload = {
      flags: MessageFlags.IsComponentsV2 as const,
      components: [SuggestionContainer.panel()],
      allowedMentions: { parse: [] },
    };

    const messages = await channel.messages.fetch({ limit: 50 });

    const existing = messages.find(
      (message) => message.author.id === client.user.id && this.isPanel(message),
    );

    if (existing) {
      await existing.edit(payload);

      return { message: existing, created: false };
    }

    return { message: await channel.send(payload), created: true };
  }

  public static async submit(member: GuildMember, input: SuggestionInput) {
    const last = await SuggestionRepository.lastByAuthor(member.id);

    if (last && Date.now() - last.createdAt.getTime() < SUGGESTION_COOLDOWN_MS) {
      const retryAt = Math.ceil((last.createdAt.getTime() + SUGGESTION_COOLDOWN_MS) / 1000);

      throw new SuggestionError(`Следующую идею можно отправить <t:${retryAt}:R>.`);
    }

    const title = input.title.replace(/\s+/g, " ").trim();
    const description = input.description.trim();

    if (title.length < 5 || description.length < 20) {
      throw new SuggestionError("Опишите идею подробнее: название от 5 символов, описание от 20.");
    }

    const category = SUGGESTION_CATEGORIES.some((entry) => entry.value === input.category)
      ? input.category
      : "other";

    const channel = await member.client.channels.fetch(SUGGESTION_BOARD_CHANNEL_ID).catch(() => null);

    if (!channel?.isSendable() || !channel.isTextBased() || channel.isDMBased() || channel.isThread()) {
      throw new SuggestionError("Канал идей недоступен. Сообщите администрации.");
    }

    const suggestion = await SuggestionRepository.create({
      guildId: member.guild.id,
      authorId: member.id,
      title,
      category,
      description,
      benefit: input.benefit.trim() || null,
    });

    try {
      const message = await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [SuggestionContainer.card(suggestion)],
        allowedMentions: { parse: [] },
      });

      const thread = await message
        .startThread({
          name: `Идея #${suggestion.number}: ${title}`.slice(0, 100),
          autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
        })
        .catch(() => null);

      return await SuggestionRepository.setMessage(suggestion.id, message.id, thread?.id ?? null);
    } catch (error) {
      await SuggestionRepository.delete(suggestion.id);

      throw error;
    }
  }

  public static async react(member: GuildMember, id: string, value: 1 | -1) {
    const suggestion = await this.loadPending(id);

    if (suggestion.authorId === member.id) {
      throw new SuggestionError("Нельзя голосовать за свою идею.");
    }

    const result = await SuggestionRepository.react(id, member.id, value);

    return { suggestion: (await SuggestionRepository.findById(id))!, result };
  }

  public static async rate(member: GuildMember, id: string, stars: number) {
    const suggestion = await this.loadPending(id);

    if (suggestion.authorId === member.id) {
      throw new SuggestionError("Нельзя оценивать свою идею.");
    }

    if (!(await ApplicationService.canRate(member))) {
      throw new SuggestionError("Оценку звёздами ставит команда проекта. Игроки голосуют кнопками 👍 и 👎.");
    }

    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      throw new SuggestionError("Некорректная оценка.");
    }

    await SuggestionRepository.rate(id, member.id, stars);

    return (await SuggestionRepository.findById(id))!;
  }

  public static async assertCanDecide(member: GuildMember, id: string) {
    if (!ApplicationService.isHighStaff(member)) {
      throw new SuggestionError("Решение по идеям принимает администрация.");
    }

    return this.loadPending(id);
  }

  public static async decide(member: GuildMember, id: string, accepted: boolean, reason: string | null) {
    await this.assertCanDecide(member, id);

    if (!(await SuggestionRepository.decide(id, accepted ? "ACCEPTED" : "REJECTED", member.id, reason))) {
      throw new SuggestionError("По этой идее уже принято решение.");
    }

    const decided = (await SuggestionRepository.findById(id))!;

    const author = await member.client.users.fetch(decided.authorId).catch(() => null);

    await author
      ?.send({
        flags: MessageFlags.IsComponentsV2,
        components: [SuggestionContainer.decisionNotice(decided, this.messageUrl(decided))],
      })
      .catch(() => null);

    if (decided.threadId) {
      const thread = await member.guild.channels.fetch(decided.threadId).catch(() => null);

      if (thread?.isThread()) {
        await thread.setArchived(true).catch(() => null);
      }
    }

    return decided;
  }

  public static messageUrl(suggestion: Suggestion) {
    return suggestion.messageId
      ? `https://discord.com/channels/${suggestion.guildId}/${SUGGESTION_BOARD_CHANNEL_ID}/${suggestion.messageId}`
      : null;
  }

  private static async loadPending(id: string) {
    const suggestion = await SuggestionRepository.findById(id);

    if (!suggestion) {
      throw new SuggestionError("Идея не найдена.");
    }

    if (suggestion.status !== "PENDING") {
      throw new SuggestionError("По этой идее уже принято решение.");
    }

    return suggestion;
  }

  private static isPanel(message: Message) {
    return JSON.stringify(message.components.map((component) => component.toJSON())).includes(
      `"${SuggestionCustomIds.build(SuggestionAction.Open)}"`,
    );
  }
}
