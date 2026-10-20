import {
  AttachmentBuilder,
  ChannelType,
  MessageFlags,
  OverwriteType,
  PermissionFlagsBits,
  type Client,
  type ForumChannel,
  type Guild,
  type GuildMember,
  type Message,
  type SendableChannels,
  type TopLevelComponent,
} from "discord.js";
import { container } from "@sapphire/framework";

import type { Ticket } from "../../../database/generated/prisma/client.js";

import { RollContainer } from "../../rolls/lib/rollContainer.js";
import { ROLL_KINDS } from "../../rolls/lib/rollKinds.js";
import { RollService } from "../../rolls/service/rollService.js";
import { RollKind } from "../../rolls/types/rolls.js";

import { CharacterSlotRepository } from "../../character/repositories/characterSlotRepository.js";
import { TicketRepository } from "../repositories/ticketRepository.js";
import { TicketError, type TicketSubject } from "../types/ticket.js";
import {
  TICKET_CALL_COOLDOWN_MS,
  TICKET_CATEGORY_ID,
  TICKET_CHARACTER_TAG_ID,
  TICKET_DELETE_DELAY_MS,
  TICKET_PANEL_CHANNEL_ID,
  TICKET_PANEL_IMAGE_NAME,
  TICKET_PANEL_IMAGE_PATH,
  TICKET_REVIEWER_ROLE_ID,
  TICKET_STAFF_CHANNEL_ID,
  TICKET_TEMPLATES_FORUM_ID,
} from "../lib/ticketConfig.js";
import { SelectReset } from "../../../lib/selectReset.js";
import { TicketContainer } from "../lib/ticketContainer.js";
import { TicketAction, TicketCustomIds } from "../lib/ticketCustomIds.js";

const MEMBER_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.AddReactions,
  PermissionFlagsBits.UseExternalEmojis,
];

const REVIEWER_OVERWRITE = {
  ViewChannel: true,
  SendMessages: true,
  ReadMessageHistory: true,
  AttachFiles: true,
  EmbedLinks: true,
  AddReactions: true,
  UseExternalEmojis: true,
  ManageMessages: true,
};

SelectReset.register(TicketCustomIds.build(TicketAction.Open), async (interaction) => ({
  ...(await TicketService.panelPayload(interaction.client)),
  attachments: [],
}));

export class TicketService {
  private static readonly opening = new Set<string>();

  public static async getForum(client: Client) {
    const channel = await client.channels.fetch(TICKET_TEMPLATES_FORUM_ID);

    if (channel?.type !== ChannelType.GuildForum) {
      throw new Error(`Ticket templates channel ${TICKET_TEMPLATES_FORUM_ID} is not a forum`);
    }

    return channel;
  }

  public static async getSubjects(client: Client): Promise<TicketSubject[]> {
    const forum = await this.getForum(client);

    return forum.availableTags.map((tag) => {
      const custom = tag.emoji?.id ? client.emojis.cache.get(tag.emoji.id) : null;

      return {
        tagId: tag.id,
        name: tag.name,
        emoji: custom?.name
          ? { id: custom.id, name: custom.name }
          : tag.emoji?.name
            ? { unicode: tag.emoji.name }
            : null,
      };
    });
  }

  public static async findTemplateUrl(forum: ForumChannel, tagId: string) {
    const active = await forum.threads.fetchActive();

    const found = active.threads.find(
      (thread) => thread.parentId === forum.id && thread.appliedTags.includes(tagId),
    );

    if (found) {
      return found.url;
    }

    const archived = await forum.threads.fetchArchived({ limit: 100 });

    return (
      archived.threads.find((thread) => thread.appliedTags.includes(tagId))?.url ?? null
    );
  }

  public static async syncPanel(client: Client<true>) {
    const channel = await client.channels.fetch(TICKET_PANEL_CHANNEL_ID);

    if (!channel?.isSendable() || !channel.isTextBased()) {
      throw new Error(`Ticket panel channel ${TICKET_PANEL_CHANNEL_ID} is not a text channel`);
    }

    const payload = await this.panelPayload(client);

    const messages = await channel.messages.fetch({ limit: 50 });

    const existing = messages.find(
      (message) => message.author.id === client.user.id && this.isPanel(message),
    );

    if (existing) {
      await existing.edit({ ...payload, attachments: [] });

      return { message: existing, created: false };
    }

    return { message: await channel.send(payload), created: true };
  }

  public static async panelPayload(client: Client) {
    return {
      flags: MessageFlags.IsComponentsV2 as const,
      components: [TicketContainer.panel(await this.getSubjects(client))],
      files: [new AttachmentBuilder(TICKET_PANEL_IMAGE_PATH, { name: TICKET_PANEL_IMAGE_NAME })],
      allowedMentions: { parse: [] },
    };
  }

  public static async open(member: GuildMember, tagId: string) {
    const key = `${member.id}:${tagId}`;

    if (this.opening.has(key)) {
      throw new TicketError("Тикет уже создаётся, подождите пару секунд.");
    }

    this.opening.add(key);

    try {
      return await this.create(member, tagId);
    } finally {
      this.opening.delete(key);
    }
  }

  private static async create(member: GuildMember, tagId: string) {
    const { client, guild } = member;

    const subject = (await this.getSubjects(client)).find((entry) => entry.tagId === tagId);

    if (!subject) {
      throw new TicketError("Этот вариант больше недоступен. Выберите другой.");
    }

    const existing = await TicketRepository.findOpen(member.id, tagId);

    if (existing) {
      const channel = await guild.channels.fetch(existing.channelId).catch(() => null);

      if (channel) {
        return { url: channel.url, subject };
      }

      if (await TicketRepository.close(existing.id, null)) {
        await this.refundUnusedSlot(existing);
      }
    }

    const paidSlot = await this.claimCharacterSlot(member.id, tagId);

    const channel = await this.createChannel(member, subject.name).catch(async (error) => {
      if (paidSlot) {
        await CharacterSlotRepository.refund(member.id);
      }

      throw error;
    });

    try {
      const ticket = await TicketRepository.create({
        guildId: guild.id,
        channelId: channel.id,
        ownerId: member.id,
        tagId,
        subject: subject.name,
        paidSlot,
      });

      const templateUrl = await this.findTemplateUrl(await this.getForum(client), tagId).catch(
        () => null,
      );

      const message = await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [TicketContainer.ticket(ticket, member.displayName, templateUrl)],
        allowedMentions: { users: [member.id] },
      });

      await message.pin().catch(() => null);

      if (tagId === TICKET_CHARACTER_TAG_ID) {
        await this.rollTrait(channel, member.id);
      }

      return { url: channel.url, subject };
    } catch (error) {
      await channel.delete("Не удалось создать тикет").catch(() => null);

      if (paidSlot) {
        await CharacterSlotRepository.refund(member.id);
      }

      throw error;
    }
  }

  private static async rollTrait(channel: SendableChannels, ownerId: string) {
    try {
      const { entry, entries } = await RollService.roll(RollKind.TRAIT);

      await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [
          RollContainer.result(ROLL_KINDS[RollKind.TRAIT], entry, RollService.effectiveChance(entry, entries), {
            reroll: false,
            caption: `Трейт персонажа <@${ownerId}>, выпал автоматически при открытии тикета`,
          }),
        ],
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      container.logger.error(error);
    }
  }

  private static async claimCharacterSlot(discordId: string, tagId: string) {
    if (tagId !== TICKET_CHARACTER_TAG_ID) {
      return false;
    }

    if (!(await CharacterSlotRepository.countActiveCharacters(discordId))) {
      return false;
    }

    if (await CharacterSlotRepository.claim(discordId)) {
      return true;
    }

    const item = await CharacterSlotRepository.getSlotItem();

    throw new TicketError(
      item
        ? `У вас уже есть персонаж. Чтобы зарегистрировать ещё одного, купите в /shop «${item.name}» за ${item.price} комс-коинов: один предмет — один новый персонаж.`
        : "У вас уже есть персонаж. Регистрация дополнительных персонажей сейчас недоступна.",
    );
  }

  private static async refundUnusedSlot(ticket: Ticket) {
    if (!ticket.paidSlot) {
      return false;
    }

    if (await CharacterSlotRepository.countCreatedSince(ticket.ownerId, ticket.createdAt)) {
      return false;
    }

    await CharacterSlotRepository.refund(ticket.ownerId);

    return true;
  }

  private static createChannel(member: GuildMember, subject: string) {
    const { client, guild } = member;

    return guild.channels.create({
      name: this.channelName(subject, member.user.username),
      type: ChannelType.GuildText,
      parent: TICKET_CATEGORY_ID,
      topic: `Регистрация: ${subject} · Игрок: ${member.user.tag} (${member.id})`,
      reason: `Тикет: ${subject}`,
      permissionOverwrites: [
        {
          id: guild.roles.everyone.id,
          type: OverwriteType.Role,
          deny: [PermissionFlagsBits.ViewChannel],
        },
        {
          id: member.id,
          type: OverwriteType.Member,
          allow: MEMBER_PERMISSIONS,
        },
        {
          id: client.user.id,
          type: OverwriteType.Member,
          allow: [...MEMBER_PERMISSIONS, PermissionFlagsBits.ManageChannels],
        },
      ],
    });
  }

  public static async call(member: GuildMember, channelId: string) {
    const ticket = await this.getOpenTicket(channelId);

    if (ticket.ownerId !== member.id && !this.isStaff(member)) {
      throw new TicketError("Вызвать анкетолога может только автор тикета.");
    }

    if (!(await TicketRepository.claimCall(ticket.id, TICKET_CALL_COOLDOWN_MS))) {
      const next = (ticket.lastCalledAt?.getTime() ?? 0) + TICKET_CALL_COOLDOWN_MS;

      throw new TicketError(
        `Анкетолог уже вызван. Повторно можно <t:${Math.ceil(next / 1000)}:R>.`,
      );
    }

    const staffChannel = await member.client.channels.fetch(TICKET_STAFF_CHANNEL_ID);

    if (!staffChannel?.isSendable()) {
      throw new Error(`Ticket staff channel ${TICKET_STAFF_CHANNEL_ID} is not sendable`);
    }

    await this.deleteStaffMessage(member.client, ticket);

    const pending = await TicketRepository.setReviewer(ticket.id, null);

    const message = await staffChannel.send({
      flags: MessageFlags.IsComponentsV2,
      components: [TicketContainer.staffCall(pending, await this.ownerName(member.guild, ticket))],
      allowedMentions: { roles: [TICKET_REVIEWER_ROLE_ID] },
    });

    await TicketRepository.setStaffMessage(ticket.id, message.id);

    return ticket;
  }

  public static async review(member: GuildMember, ticketId: string) {
    if (!this.isStaff(member)) {
      throw new TicketError("Рассматривать тикеты могут только анкетологи.");
    }

    const ticket = await TicketRepository.findById(ticketId);

    if (!ticket || ticket.status !== "OPEN") {
      throw new TicketError("Этот тикет уже закрыт.");
    }

    const channel = await member.guild.channels.fetch(ticket.channelId).catch(() => null);

    if (!channel || channel.type !== ChannelType.GuildText) {
      await this.finishClose(member.client, member.guild, ticket, null);

      throw new TicketError("Канал тикета больше не существует, тикет закрыт.");
    }

    const alreadyIn = channel.permissionOverwrites.cache.has(member.id);

    if (!alreadyIn) {
      await channel.permissionOverwrites.create(member.id, REVIEWER_OVERWRITE, {
        type: OverwriteType.Member,
        reason: "Анкетолог рассматривает тикет",
      });
    }

    const updated = await TicketRepository.setReviewer(ticket.id, member.id);

    await this.refreshStaffMessage(member.client, member.guild, updated);

    if (!alreadyIn) {
      await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [TicketContainer.reviewerJoined(member.id)],
        allowedMentions: { users: [ticket.ownerId] },
      });
    }

    return { url: channel.url, ticket };
  }

  public static async assertCanClose(member: GuildMember, channelId: string) {
    const ticket = await this.getOpenTicket(channelId);

    if (ticket.ownerId !== member.id && !this.isStaff(member)) {
      throw new TicketError("Закрыть тикет может только его автор или анкетолог.");
    }

    return ticket;
  }

  public static async close(member: GuildMember, channelId: string) {
    const ticket = await this.assertCanClose(member, channelId);

    if (!(await this.finishClose(member.client, member.guild, ticket, member.id))) {
      throw new TicketError("Тикет уже закрыт.");
    }

    setTimeout(() => {
      this.deleteChannel(member.guild, channelId).catch(() => null);
    }, TICKET_DELETE_DELAY_MS);

    return ticket;
  }

  public static async cleanupClosed(guild: Guild) {
    const tickets = await TicketRepository.findRecentClosed(guild.id);

    let removed = 0;

    for (const ticket of tickets) {
      if (await this.deleteChannel(guild, ticket.channelId)) {
        removed++;
      }
    }

    return removed;
  }

  public static async closeForLeaver(guild: Guild, userId: string) {
    const tickets = await TicketRepository.findOpenByOwner(guild.id, userId);

    let removed = 0;

    for (const ticket of tickets) {
      if (await this.finishClose(guild.client, guild, ticket, null)) {
        await this.deleteChannel(guild, ticket.channelId, "Автор тикета покинул сервер").catch(() => null);
        removed++;
      }
    }

    return removed;
  }

  public static async cleanupLeavers(guild: Guild) {
    const tickets = await TicketRepository.findAllOpen(guild.id);
    const owners = [...new Set(tickets.map((ticket) => ticket.ownerId))];

    let removed = 0;

    for (const ownerId of owners) {
      const member = await guild.members.fetch(ownerId).catch((error) => (error?.code === 10007 ? null : undefined));

      if (member === null) {
        removed += await this.closeForLeaver(guild, ownerId);
      }
    }

    return removed;
  }

  public static async handleChannelDelete(guild: Guild, channelId: string) {
    const ticket = await TicketRepository.findByChannel(channelId);

    if (ticket?.status === "OPEN") {
      await this.finishClose(guild.client, guild, ticket, null);
    }
  }

  public static isStaff(member: GuildMember) {
    return (
      member.roles.cache.has(TICKET_REVIEWER_ROLE_ID) ||
      member.permissions.has(PermissionFlagsBits.ManageGuild)
    );
  }

  private static async finishClose(
    client: Client,
    guild: Guild,
    ticket: Ticket,
    closedById: string | null,
  ) {
    if (!(await TicketRepository.close(ticket.id, closedById))) {
      return false;
    }

    await this.refreshStaffMessage(client, guild, { ...ticket, status: "CLOSED" });

    const refunded = await this.refundUnusedSlot(ticket);

    const owner = await client.users.fetch(ticket.ownerId).catch(() => null);

    await owner
      ?.send({
        flags: MessageFlags.IsComponentsV2,
        components: [TicketContainer.closedDm(ticket.subject, refunded)],
      })
      .catch(() => null);

    return true;
  }

  private static async fetchStaffMessage(client: Client, ticket: Ticket) {
    if (!ticket.staffMessageId) {
      return null;
    }

    const channel = await client.channels.fetch(TICKET_STAFF_CHANNEL_ID).catch(() => null);

    if (!channel?.isTextBased()) {
      return null;
    }

    return channel.messages.fetch(ticket.staffMessageId).catch(() => null);
  }

  private static async deleteStaffMessage(client: Client, ticket: Ticket) {
    const message = await this.fetchStaffMessage(client, ticket);

    await message?.delete().catch(() => null);
  }

  private static async refreshStaffMessage(client: Client, guild: Guild, ticket: Ticket) {
    const message = await this.fetchStaffMessage(client, ticket);

    await message
      ?.edit({
        flags: MessageFlags.IsComponentsV2,
        components: [TicketContainer.staffCall(ticket, await this.ownerName(guild, ticket))],
        allowedMentions: { parse: [] },
      })
      .catch(() => null);
  }

  private static async ownerName(guild: Guild, ticket: Ticket) {
    const member = await guild.members.fetch(ticket.ownerId).catch(() => null);

    return member?.displayName ?? ticket.ownerId;
  }

  private static async getOpenTicket(channelId: string) {
    const ticket = await TicketRepository.findByChannel(channelId);

    if (!ticket || ticket.status !== "OPEN") {
      throw new TicketError("Этот тикет уже закрыт.");
    }

    return ticket;
  }

  private static async deleteChannel(guild: Guild, channelId: string, reason = "Тикет закрыт") {
    const channel = await guild.channels.fetch(channelId).catch(() => null);

    if (!channel) {
      return false;
    }

    await channel.delete(reason);

    return true;
  }

  private static channelName(subject: string, username: string) {
    return `🎫・${subject}-${username}`.toLowerCase().replace(/\s+/g, "-").slice(0, 100);
  }

  private static isPanel(message: Message) {
    const customId = TicketCustomIds.build(TicketAction.Open);

    return message.components.some((component) => this.hasCustomId(component, customId));
  }

  private static hasCustomId(component: TopLevelComponent | object, customId: string): boolean {
    const data = component as {
      customId?: string;
      components?: object[];
    };

    if (data.customId === customId) {
      return true;
    }

    return (data.components ?? []).some((child) => this.hasCustomId(child, customId));
  }
}
