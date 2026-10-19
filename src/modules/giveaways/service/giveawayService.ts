import { randomInt } from "node:crypto";

import { container } from "@sapphire/framework";

import {
  ChannelType,
  MessageFlags,
  type Attachment,
  type BaseInteraction,
  type Client,
  type Guild,
} from "discord.js";

import type { Giveaway } from "../../../database/generated/prisma/client.js";

import { Storage } from "../../../lib/storage.js";
import { PermissionService } from "../../permissions/service/permissionService.js";
import { GiveawayContainer } from "../lib/giveawayContainer.js";
import { GiveawayDuration } from "../lib/giveawayDuration.js";
import { GiveawayRepository } from "../repositories/giveawayRepository.js";
import { GiveawayError, type GiveawayInput } from "../types/giveaway.js";

const MAX_WINNERS = 20;
const REFRESH_DELAY_MS = 3_000;
const CHANNELS_PER_PAGE = 25;

export class GiveawayService {
  public static readonly MANAGE_KEY = "manage.giveaways";

  private static refreshTimers = new Map<string, NodeJS.Timeout>();

  public static async assertCanManage(interaction: BaseInteraction) {
    const subject = await PermissionService.resolveSubject(interaction);

    if (!subject.guildId || !(await PermissionService.canUse(subject, this.MANAGE_KEY))) {
      throw new GiveawayError("У вас нет доступа к управлению розыгрышами.");
    }

    return subject.guildId;
  }

  public static getGuild(client: Client, guildId: string) {
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      throw new GiveawayError("Сервер бота недоступен.");
    }

    return guild;
  }

  public static async create(
    client: Client,
    guildId: string,
    hostId: string,
    input: GiveawayInput,
    image: Attachment | null,
  ) {
    const prize = input.prize.replace(/\s+/g, " ").trim();

    if (!prize) {
      throw new GiveawayError("Укажите, что разыгрывается.");
    }

    const winnerCount = Number(input.winners.trim());

    if (!Number.isInteger(winnerCount) || winnerCount < 1 || winnerCount > MAX_WINNERS) {
      throw new GiveawayError(`Количество победителей — целое число от 1 до ${MAX_WINNERS}.`);
    }

    const minutes = GiveawayDuration.parse(input.duration);

    const settings = await GiveawayRepository.getSettings(guildId);

    if (!settings?.channelId) {
      throw new GiveawayError("Сначала выберите канал для розыгрышей в настройках.");
    }

    const channel = await client.channels.fetch(settings.channelId).catch(() => null);

    if (!channel?.isSendable() || channel.isDMBased()) {
      throw new GiveawayError("Канал для розыгрышей недоступен. Выберите другой в настройках.");
    }

    const imagePath = image ? await Storage.uploadAttachment(image) : null;

    const giveaway = await GiveawayRepository.create({
      guildId,
      channelId: channel.id,
      hostId,
      prize: prize.slice(0, 200),
      description: input.description.trim() || null,
      imagePath,
      winnerCount,
      endsAt: new Date(Date.now() + minutes * 60_000),
    });

    try {
      const message = await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [GiveawayContainer.message(giveaway, 0, settings.pingRoleId)],
        allowedMentions: { roles: settings.pingRoleId ? [settings.pingRoleId] : [] },
      });

      return await GiveawayRepository.setMessage(giveaway.id, message.id);
    } catch (error) {
      await GiveawayRepository.delete(giveaway.id);
      await Storage.delete(imagePath);

      throw error;
    }
  }

  public static async toggleEntry(giveawayId: string, userId: string) {
    const giveaway = await GiveawayRepository.findById(giveawayId);

    if (!giveaway || giveaway.status !== "ACTIVE" || giveaway.endsAt.getTime() <= Date.now()) {
      throw new GiveawayError("Этот розыгрыш уже завершён.");
    }

    const joined = await GiveawayRepository.toggleEntry(giveawayId, userId);

    this.scheduleRefresh(giveaway);

    return { giveaway, joined };
  }

  public static async get(guildId: string, id: string) {
    const giveaway = await GiveawayRepository.findById(id);

    if (!giveaway || giveaway.guildId !== guildId) {
      throw new GiveawayError("Розыгрыш не найден.");
    }

    return giveaway;
  }

  public static async endNow(client: Client, guildId: string, id: string) {
    const giveaway = await this.get(guildId, id);

    if (giveaway.status !== "ACTIVE") {
      throw new GiveawayError("Этот розыгрыш уже завершён.");
    }

    await this.finish(client, giveaway);
  }

  public static async cancel(client: Client, guildId: string, id: string) {
    await this.get(guildId, id);

    if (!(await GiveawayRepository.cancel(id))) {
      throw new GiveawayError("Отменить можно только идущий розыгрыш.");
    }

    await this.refresh(client, id);
  }

  public static async reroll(client: Client, guildId: string, id: string) {
    const giveaway = await this.get(guildId, id);

    if (giveaway.status !== "ENDED") {
      throw new GiveawayError("Перевыбрать победителей можно только в завершённом розыгрыше.");
    }

    const guild = this.getGuild(client, guildId);

    const winners = await this.pickWinners(guild, giveaway, giveaway.winnerIds);

    if (!winners.length) {
      throw new GiveawayError("Не осталось участников, которые ещё не выигрывали.");
    }

    const updated = await GiveawayRepository.setWinners(id, winners);

    await this.announce(client, updated, true);
  }

  public static async runDue(client: Client) {
    const due = await GiveawayRepository.findDue();

    for (const giveaway of due) {
      await this.finish(client, giveaway).catch((error) => container.logger.error(error));
    }

    return due.length;
  }

  public static async counts(giveaways: Giveaway[]) {
    return new Map(
      await Promise.all(
        giveaways.map(async (giveaway) => [giveaway.id, await GiveawayRepository.countEntries(giveaway.id)] as const),
      ),
    );
  }

  public static getChannelPage(guild: Guild, page: number) {
    const channels = [...guild.channels.cache.values()]
      .filter((channel) => channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement)
      .sort((left, right) => left.rawPosition - right.rawPosition)
      .map((channel) => ({ id: channel.id, name: channel.name }));

    const totalPages = Math.max(1, Math.ceil(channels.length / CHANNELS_PER_PAGE));
    const safePage = Number.isInteger(page) ? Math.min(Math.max(page, 0), totalPages - 1) : 0;

    return {
      channels: channels.slice(safePage * CHANNELS_PER_PAGE, (safePage + 1) * CHANNELS_PER_PAGE),
      page: safePage,
      totalPages,
    };
  }

  public static messageUrl(giveaway: Giveaway) {
    return giveaway.messageId
      ? `https://discord.com/channels/${giveaway.guildId}/${giveaway.channelId}/${giveaway.messageId}`
      : null;
  }

  private static async finish(client: Client, giveaway: Giveaway) {
    if (!(await GiveawayRepository.claimEnd(giveaway.id))) {
      return;
    }

    const guild = this.getGuild(client, giveaway.guildId);

    const winners = await this.pickWinners(guild, giveaway, []);

    const updated = await GiveawayRepository.setWinners(giveaway.id, winners);

    await this.announce(client, updated, false);
  }

  private static async announce(client: Client, giveaway: Giveaway, reroll: boolean) {
    await this.refresh(client, giveaway.id);

    const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);

    if (channel?.isSendable()) {
      await channel
        .send({
          flags: MessageFlags.IsComponentsV2,
          components: [GiveawayContainer.winners(giveaway, reroll)],
          allowedMentions: { users: giveaway.winnerIds },
          reply: giveaway.messageId ? { messageReference: giveaway.messageId, failIfNotExists: false } : undefined,
        })
        .catch(() => null);
    }

    for (const winnerId of giveaway.winnerIds) {
      const user = await client.users.fetch(winnerId).catch(() => null);

      await user
        ?.send({
          flags: MessageFlags.IsComponentsV2,
          components: [GiveawayContainer.winnerNotice(giveaway, this.messageUrl(giveaway))],
        })
        .catch(() => null);
    }
  }

  private static async pickWinners(guild: Guild, giveaway: Giveaway, exclude: string[]) {
    const pool = (await GiveawayRepository.entryIds(giveaway.id)).filter((id) => !exclude.includes(id));

    for (let index = pool.length - 1; index > 0; index--) {
      const swap = randomInt(index + 1);
      [pool[index], pool[swap]] = [pool[swap], pool[index]];
    }

    const winners: string[] = [];

    for (const userId of pool) {
      if (winners.length >= giveaway.winnerCount) {
        break;
      }

      if (await guild.members.fetch(userId).catch(() => null)) {
        winners.push(userId);
      }
    }

    return winners;
  }

  private static scheduleRefresh(giveaway: Giveaway) {
    if (this.refreshTimers.has(giveaway.id)) {
      return;
    }

    const timer = setTimeout(() => {
      this.refreshTimers.delete(giveaway.id);

      void this.refresh(null, giveaway.id).catch(() => null);
    }, REFRESH_DELAY_MS);

    timer.unref();

    this.refreshTimers.set(giveaway.id, timer);
  }

  private static async refresh(client: Client | null, id: string) {
    const giveaway = await GiveawayRepository.findById(id);
    const resolved = client ?? container.client;

    if (!giveaway?.messageId) {
      return;
    }

    const channel = await resolved.channels.fetch(giveaway.channelId).catch(() => null);

    if (!channel?.isTextBased() || channel.isDMBased()) {
      return;
    }

    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);

    await message
      ?.edit({
        flags: MessageFlags.IsComponentsV2,
        components: [
          GiveawayContainer.message(
            giveaway,
            await GiveawayRepository.countEntries(id),
            (await GiveawayRepository.getSettings(giveaway.guildId))?.pingRoleId ?? null,
          ),
        ],
        allowedMentions: { parse: [] },
      })
      .catch(() => null);
  }
}
