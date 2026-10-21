import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from "discord.js";

import { CoinFormatter } from "../../coins/lib/coinFormatter.js";
import type { ActivityRow } from "../repositories/activityRepository.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const HEADER = "<:835596rank:1518581047636525086>";
const MEDALS = ["🥇", "🥈", "🥉"];

export type TopView = {
  rows: ActivityRow[];
  page: number;
  totalPages: number;
  total: number;
  viewer: (ActivityRow & { rank: number }) | null;
  rewards: [number, number, number];
  resetAt: Date;
};

export class ActivityContainer {
  public static top(view: TopView, pageSize: number, bannerName: string | null) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    if (bannerName) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(`attachment://${bannerName}`),
        ),
      );
    }

    const resetAt = Math.floor(view.resetAt.getTime() / 1000);

    const rewards = view.rewards
      .map((amount, index) => (amount > 0 ? `${MEDALS[index]} ${CoinFormatter.amount(amount)}` : null))
      .filter((line): line is string => line !== null);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${HEADER} Самые активные за неделю`,
          "",
          `${ARROW} Очки: 1 сообщение = 1 очко, 1 минута в голосовом = 1 очко.`,
          `${ARROW} Рейтинг обнулится <t:${resetAt}:R> (<t:${resetAt}:f>).`,
          rewards.length ? `${ARROW} Награды тройке лидеров: ${rewards.join(" · ")}` : null,
        ]
          .filter((line) => line !== null)
          .join("\n"),
      ),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        view.rows.length
          ? view.rows
              .map((row, index) => this.line(row, view.page * pageSize + index + 1))
              .join("\n")
          : "-# На этой неделе пока никто не проявлял активность.",
      ),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          view.viewer
            ? `-# <@${view.viewer.discordId}>: **${view.viewer.rank}** место из ${view.total} · ${view.viewer.score} очк.`
            : null,
          `-# Страница ${view.page + 1} из ${view.totalPages}`,
        ]
          .filter((line) => line !== null)
          .join("\n"),
      ),
    );

    if (view.totalPages > 1) {
      container.addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(`top:page:${view.page - 1}`)
            .setEmoji("<:172852arrowleft:1518587345249763452>")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(view.page <= 0),
          new ButtonBuilder()
            .setCustomId(`top:page:${view.page + 1}`)
            .setEmoji("<:383438arrowright:1518587353390907473>")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(view.page >= view.totalPages - 1),
        ),
      );
    }

    return container;
  }

  public static winnerNotice(place: number, amount: number, row: ActivityRow) {
    return new ContainerBuilder().setAccentColor(0x475b56).addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `## ${MEDALS[place - 1] ?? HEADER} ${place} место в недельном рейтинге активности`,
          `${ARROW} За неделю: ${row.messages} сообщений и ${this.voice(row.voiceSeconds)} в голосовых.`,
          `${ARROW} Награда: ${CoinFormatter.amount(amount)}`,
          "-# Рейтинг обнулён, новая неделя уже началась.",
        ].join("\n"),
      ),
    );
  }

  private static line(row: ActivityRow, rank: number) {
    const badge = MEDALS[rank - 1] ?? `\`${String(rank).padStart(2, " ")}.\``;

    return `${badge} <@${row.discordId}> — **${row.score}** очк.\n-# ${row.messages} сообщ. · ${this.voice(row.voiceSeconds)} в голосовых`;
  }

  private static voice(seconds: number) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return hours ? `${hours} ч ${minutes} мин` : `${minutes} мин`;
  }
}
