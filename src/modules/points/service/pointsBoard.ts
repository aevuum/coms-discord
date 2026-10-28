import { container } from "@sapphire/framework";

import {
  AttachmentBuilder,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  PermissionFlagsBits,
  TextDisplayBuilder,
  type Client,
} from "discord.js";

import { HOURGLASS_FILE, HourglassCard } from "../lib/hourglassCard.js";
import { PointsRepository } from "../repositories/pointsRepository.js";
import { HOUSE_EMOJIS, HOUSE_LABELS, PointsError, type House } from "../types/points.js";

const REFRESH_DELAY_MS = 4_000;
const RECENT = 5;

export class PointsBoard {
  private static timer: NodeJS.Timeout | null = null;

  private static lastKey = new Map<string, string>();

  public static async render() {
    const [totals, recent] = await Promise.all([PointsRepository.totals(), PointsRepository.recent(RECENT)]);
    const key = JSON.stringify([totals, recent.map((log) => log.id)]);

    return {
      key,
      build: async () => {
        const card = new ContainerBuilder().setAccentColor(0x475b56);

        card.addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder()
              .setURL(`attachment://${HOURGLASS_FILE}`)
              .setDescription(totals.map((entry) => `${HOUSE_LABELS[entry.faculty]}: ${entry.points}`).join(", ")),
          ),
        );

        if (recent.length) {
          card.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              [
                "-# Последние изменения:",
                ...recent.map(
                  (log) =>
                    `-# ${HOUSE_EMOJIS[log.faculty as House]} **${log.delta > 0 ? "+" : ""}${log.delta}** ${HOUSE_LABELS[log.faculty as House]} · <@${log.actorId}> · <t:${Math.floor(log.createdAt.getTime() / 1000)}:R>`,
                ),
              ].join("\n"),
            ),
          );
        }

        return {
          components: [card],
          files: [new AttachmentBuilder(await HourglassCard.render(totals), { name: HOURGLASS_FILE })],
        };
      },
    };
  }

  public static schedule() {
    if (this.timer) {
      return;
    }

    this.timer = setTimeout(() => {
      this.timer = null;
      void this.refreshAll(container.client).catch((error) => container.logger.error(error));
    }, REFRESH_DELAY_MS);

    this.timer.unref();
  }

  public static async refreshAll(client: Client) {
    for (const settings of await PointsRepository.allSettings()) {
      if (settings.channelId) {
        await this.refresh(client, settings.guildId).catch((error) => container.logger.error(error));
      }
    }
  }

  public static async setChannel(client: Client, guildId: string, channelId: string | null) {
    const settings = await PointsRepository.settings(guildId);

    if (settings?.channelId && settings.messageId && settings.channelId !== channelId) {
      const old = await client.channels.fetch(settings.channelId).catch(() => null);

      if (old?.isTextBased() && !old.isDMBased()) {
        await old.messages.delete(settings.messageId).catch(() => null);
      }
    }

    if (!channelId) {
      await PointsRepository.saveSettings(guildId, { channelId: null, messageId: null });
      return;
    }

    const channel = await client.channels.fetch(channelId).catch(() => null);

    if (!channel || channel.isDMBased() || !channel.isSendable() || channel.guildId !== guildId) {
      throw new PointsError("Выберите текстовый канал сервера для часов факультетов.");
    }

    const me = channel.guild.members.me;
    const permissions = me ? channel.permissionsFor(me) : null;

    if (!permissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles])) {
      throw new PointsError(`Боту нужны права «Отправлять сообщения» и «Прикреплять файлы» в <#${channelId}>.`);
    }

    await PointsRepository.saveSettings(guildId, {
      channelId,
      messageId: settings?.channelId === channelId ? settings.messageId : null,
    });

    this.lastKey.delete(guildId);
    await this.refresh(client, guildId);
  }

  private static async refresh(client: Client, guildId: string) {
    const settings = await PointsRepository.settings(guildId);

    if (!settings?.channelId) {
      return;
    }

    const channel = await client.channels.fetch(settings.channelId).catch(() => null);

    if (!channel?.isTextBased() || channel.isDMBased() || !channel.isSendable()) {
      return;
    }

    const board = await this.render();
    const message = settings.messageId ? await channel.messages.fetch(settings.messageId).catch(() => null) : null;

    if (message) {
      if (this.lastKey.get(guildId) === board.key) {
        return;
      }

      await message.edit({ flags: MessageFlags.IsComponentsV2, ...(await board.build()), attachments: [], allowedMentions: { parse: [] } });
    } else {
      const sent = await channel.send({ flags: MessageFlags.IsComponentsV2, ...(await board.build()), allowedMentions: { parse: [] } });
      await PointsRepository.saveSettings(guildId, { messageId: sent.id });
    }

    this.lastKey.set(guildId, board.key);
  }
}
