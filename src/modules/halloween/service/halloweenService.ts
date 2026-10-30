import { container } from "@sapphire/framework";

import { PermissionFlagsBits, type BaseInteraction, type Client, type Message } from "discord.js";

import type { HalloweenSettings } from "../../../database/generated/prisma/client.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { HalloweenRules } from "../lib/halloweenRules.js";
import { ClaimResult, HalloweenRepository } from "../repositories/halloweenRepository.js";
import {
  CANDY,
  HALLOWEEN_MANAGE_KEY,
  HalloweenChoice,
  HalloweenError,
  PUMPKIN,
  PUMPKIN_LIMIT,
} from "../types/halloween.js";

const ACTIVE_WINDOW_MS = 20 * 60 * 1000;

const plural = (count: number, one: string, few: string, many: string) => {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
};

export const candies = (count: number) => `${count} ${plural(count, "конфету", "конфеты", "конфет")}`;

export class HalloweenService {
  private static activity = new Map<string, number>();

  public static async assertCanManage(interaction: BaseInteraction) {
    const subject = await PermissionService.resolveSubject(interaction);

    if (!subject.guildId || !(await PermissionService.canUse(subject, HALLOWEEN_MANAGE_KEY))) {
      throw new HalloweenError("У вас нет доступа к хэллоуинскому ивенту.");
    }

    return subject.guildId;
  }

  public static noteActivity(message: Message) {
    this.activity.set(message.channelId, Date.now());
  }

  public static async tick(client: Client<true>) {
    const now = new Date();

    for (const drop of await HalloweenRepository.expireDue(now)) {
      await this.editDrop(client, drop.channelId, drop.messageId, `${PUMPKIN} ~~Магия или жизнь?~~\n-# Никто не ответил — тыква укатилась в темноту.`);
    }

    for (const settings of await HalloweenRepository.allEnabled()) {
      if (settings.endsAt && settings.endsAt <= now) {
        await HalloweenRepository.save(settings.guildId, { enabled: false, nextDropAt: null });
        container.logger.info(`Halloween event ended in ${settings.guildId}`);
        continue;
      }

      if (!settings.nextDropAt) {
        await HalloweenRepository.save(settings.guildId, { nextDropAt: HalloweenRules.nextDrop(now, settings.minMinutes, settings.maxMinutes) });
        continue;
      }

      if (settings.nextDropAt > now || (await HalloweenRepository.hasOpenDrop(settings.guildId))) {
        continue;
      }

      await this.spawn(client, settings).catch((error) => container.logger.error(error));
    }
  }

  public static async spawn(client: Client, settings: HalloweenSettings) {
    const channel = await this.pickChannel(client, settings);

    await HalloweenRepository.save(settings.guildId, {
      nextDropAt: HalloweenRules.nextDrop(new Date(), settings.minMinutes, settings.maxMinutes),
    });

    if (!channel) {
      throw new HalloweenError("Нет ни одного доступного канала для тыкв — выберите каналы в настройках.");
    }

    const message = await channel.send({
      content: [
        `# ${PUMPKIN}`,
        "**Магия или жизнь?**",
        `-# Ответьте на это сообщение «магия» или «жизнь». Первый получит награду: за магию — конфеты ${CANDY}, за жизнь — тыкву-артефакт ${PUMPKIN}.`,
      ].join("\n"),
      allowedMentions: { parse: [] },
    });

    await HalloweenRepository.createDrop({
      guildId: settings.guildId,
      channelId: channel.id,
      messageId: message.id,
      expiresAt: new Date(Date.now() + settings.lifetimeMinutes * 60_000),
    });

    return channel.id;
  }

  public static async handleReply(message: Message) {
    const reference = message.reference?.messageId;

    if (!reference || !message.inGuild()) {
      return;
    }

    const drop = await HalloweenRepository.openDrop(reference);

    if (!drop) {
      return;
    }

    const choice = HalloweenRules.answer(message.content);

    if (!choice) {
      return;
    }

    const settings = await HalloweenRepository.ensureItems(drop.guildId);
    const magic = choice === HalloweenChoice.Magic;
    const amount = magic ? HalloweenRules.between(settings.candyMin, settings.candyMax) : 1;

    const result = await HalloweenRepository.claim(
      drop.id,
      message.author.id,
      choice,
      magic ? settings.candyItemId : settings.pumpkinItemId,
      amount,
      magic ? null : PUMPKIN_LIMIT,
    );

    if (result === ClaimResult.Limit) {
      await message.reply({ content: "Вы израсходовали все свои жизни, может пришло время выбрать магию?", allowedMentions: { repliedUser: false } }).catch(() => null);
      return;
    }

    if (result === ClaimResult.Taken) {
      return;
    }

    const reward = magic ? `${CANDY} ${candies(amount)}` : `${PUMPKIN} тыкву-артефакт`;
    const pumpkins = magic ? null : await HalloweenRepository.quantity(message.author.id, settings.pumpkinItemId);

    await message
      .reply({
        content: `${magic ? "Магия!" : "Жизнь!"} Вы получаете ${reward}${pumpkins !== null ? ` — тыкв у вас ${pumpkins} из ${PUMPKIN_LIMIT}` : ""}. Загляните в /halloween.`,
        allowedMentions: { repliedUser: false },
      })
      .catch(() => null);

    await this.editDrop(
      message.client,
      drop.channelId,
      drop.messageId,
      `${PUMPKIN} ~~Магия или жизнь?~~\n-# <@${message.author.id}> выбрал(а) **${magic ? "магию" : "жизнь"}** и забрал(а) ${reward}.`,
    );
  }

  public static async exchange(discordId: string, guildId: string, kind: "candy" | "pumpkin", input: string) {
    const settings = await HalloweenRepository.ensureItems(guildId);
    const itemId = kind === "candy" ? settings.candyItemId : settings.pumpkinItemId;
    const held = await HalloweenRepository.quantity(discordId, itemId);
    const amount = input.trim().toLowerCase() === "все" || input.trim().toLowerCase() === "всё" ? held : HalloweenRules.number(input, "Количество", 1, 100_000);

    if (!amount) {
      throw new HalloweenError(kind === "candy" ? "У вас нет конфет." : "У вас нет тыкв-артефактов.");
    }

    return HalloweenRepository.exchange(
      discordId,
      itemId,
      amount,
      kind === "candy" ? settings.candyRate : settings.pumpkinRate,
      kind === "candy" ? "конфеты" : "тыква-артефакт",
    );
  }

  public static async buy(discordId: string, guildId: string, offerId: string) {
    const settings = await HalloweenRepository.ensureItems(guildId);

    return HalloweenRepository.buy(discordId, offerId, settings.candyItemId, settings.pumpkinItemId);
  }

  private static async pickChannel(client: Client, settings: HalloweenSettings) {
    const usable = [];

    for (const id of settings.channelIds) {
      const channel = await client.channels.fetch(id).catch(() => null);

      if (!channel || channel.isDMBased() || !channel.isSendable() || channel.guildId !== settings.guildId) {
        continue;
      }

      const me = channel.guild.members.me;

      if (me && channel.permissionsFor(me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
        usable.push(channel);
      }
    }

    const now = Date.now();
    const active = usable.filter((channel) => now - (this.activity.get(channel.id) ?? 0) < ACTIVE_WINDOW_MS);
    const pool = active.length ? active : usable;

    return pool[Math.floor(Math.random() * pool.length)] ?? null;
  }

  private static async editDrop(client: Client, channelId: string, messageId: string, content: string) {
    const channel = await client.channels.fetch(channelId).catch(() => null);

    if (!channel?.isTextBased() || channel.isDMBased()) {
      return;
    }

    const message = await channel.messages.fetch(messageId).catch(() => null);

    await message?.edit({ content, allowedMentions: { parse: [] } }).catch(() => null);
  }
}
