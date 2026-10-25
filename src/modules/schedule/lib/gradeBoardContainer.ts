import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
} from "discord.js";

import type { CharacterFaculty, Subject } from "../../../database/generated/prisma/client.js";

import { CharacterFormatter } from "../../economy/lib/characterFormatter.js";
import { GradeMath, MAX_GRADE } from "./gradeMath.js";
import { GRADES_HEADER } from "./gradesContainer.js";
import { PAD, text } from "./lessonCard.js";
import { MoscowTime } from "./moscowTime.js";

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

  public static page(students: BoardStudent[], month: string, page: number, personal: boolean) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);
    const pages = this.pages(students.length);
    const current = Math.min(Math.max(page, 0), pages - 1);
    const slice = students.slice(current * BOARD_PAGE_SIZE, (current + 1) * BOARD_PAGE_SIZE);

    text(container, [
      `# ${GRADES_HEADER} Табель успеваемости`,
      `-# ${MoscowTime.monthLabel(month)} · учеников: ${students.length}${personal ? " · эту страницу видите только вы" : ""}`,
    ]);

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    text(
      container,
      slice.length
        ? slice.flatMap((student) => [
            `${CharacterFormatter.facultyEmoji(student.faculty)} **${student.rpName}** · ${
              student.average === null ? "оценок нет" : `**${GradeMath.formatAverage(student.average)}** / ${MAX_GRADE} · оценок ${student.grades}`
            } · посещаемость ${student.attendance.total ? `${student.attendance.present} из ${student.attendance.total}` : "—"}`,
            student.subjects.length
              ? `-# ${student.subjects.map((entry) => `${entry.subject.name} ${GradeMath.formatAverage(entry.average)}`).join(" · ")}`.slice(0, 300)
              : null,
          ])
        : ["-# Учеников пока нет."],
    );

    text(container, [
      "-# Средний балл и посещаемость за месяц. Подробный табель своего персонажа — /grades.",
      `-# ${PAD}`,
    ]);

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
