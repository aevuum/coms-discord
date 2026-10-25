import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
} from "discord.js";

import type { CharacterFaculty, Subject } from "../../../database/generated/prisma/client.js";

import { text } from "./lessonCard.js";
import { MoscowTime } from "./moscowTime.js";

export const BOARD_FILE = "board.jpg";
export const BOARD_PAGE_SIZE = 8;

export type BoardStudent = {
  id: string;
  rpName: string;
  faculty: CharacterFaculty;
  average: number | null;
  grades: number;
  subjects: { subject: Subject; average: number }[];
  attendance: { present: number; total: number };
};

export const BOARD_PREFIX = "gboard";

export class GradeBoardContainer {
  public static customId(month: string, page: number | "counter") {
    return `${BOARD_PREFIX}:${month}:${page}`;
  }

  public static parse(customId: string) {
    const [prefix, month, page] = customId.split(":");

    if (prefix !== BOARD_PREFIX || !MoscowTime.isMonthKey(month ?? "") || !/^\d+$/.test(page ?? "")) {
      return null;
    }

    return { month, page: Number(page) };
  }

  public static pages(total: number) {
    return Math.max(Math.ceil(total / BOARD_PAGE_SIZE), 1);
  }

  public static page(month: string, current: number, pages: number, personal: boolean) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder()
          .setURL(`attachment://${BOARD_FILE}`)
          .setDescription(`Ведомость успеваемости, ${MoscowTime.monthLabel(month)}, лист ${current + 1} из ${pages}`),
      ),
    );

    if (personal) {
      text(container, ["-# Этот лист видите только вы."]);
    }

    if (pages > 1) {
      container.addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(this.customId(month, Math.max(current - 1, 0)))
            .setEmoji("<:172852arrowleft:1518587345249763452>")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(current === 0),
          new ButtonBuilder()
            .setCustomId(this.customId(month, "counter"))
            .setLabel(`${current + 1} / ${pages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(this.customId(month, Math.min(current + 1, pages - 1)))
            .setEmoji("<:383438arrowright:1518587353390907473>")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(current >= pages - 1),
        ),
      );
    }

    return container;
  }
}
