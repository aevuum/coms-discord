import type { CharacterFaculty } from "../../../database/generated/prisma/client.js";

import { MoscowTime } from "./moscowTime.js";
import {
  CAPS,
  HAND,
  hash,
  HOUSE_NAMES,
  INK,
  INKS,
  Parchment,
  PENCIL,
  PENCIL_DARK,
  RULE_SOFT,
  SCRIPT,
} from "./parchment.js";

export const TIMETABLE_FILE = "timetable.jpg";

const CARD_W = 1660;
const CARD_H = 1120;

const MONTHS = ["янв.", "февр.", "марта", "апр.", "мая", "июня", "июля", "авг.", "сент.", "окт.", "нояб.", "дек."];

export const shortDate = (date: Date) => {
  const { day, month } = MoscowTime.parts(date);

  return `${day} ${MONTHS[month - 1]}`;
};

const DAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

const PERIODS = [
  { until: 12 * 60, meal: "Завтрак" },
  { until: 17 * 60, meal: "Обед" },
  { until: 24 * 60, meal: "Ужин" },
];

export type TimetableLesson = {
  startsAt: Date;
  subjectId: string;
  subjectName: string;
  note: string;
  enrolled: boolean;
  faded: boolean;
};

export type TimetableInput = {
  faculty: CharacterFaculty;
  title?: string;
  ownerName: string;
  weekStart: Date;
  lessons: TimetableLesson[];
  legend: "student" | "teacher";
};

type Slot = { minutes: number; label: string };

type Row = { kind: "meal"; label: string; height: number } | { kind: "slot"; slot: Slot; number: number; height: number };

export class TimetableCard {
  public static async render(input: TimetableInput) {
    const sheet = Parchment.create(CARD_W, CARD_H, `${input.ownerName}:${input.weekStart.toISOString()}`);
    const end = new Date(input.weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

    await sheet.header({
      title: input.title ?? HOUSE_NAMES[input.faculty],
      crest: input.faculty,
      left: ["Расписание занятий", `неделя ${shortDate(input.weekStart)} — ${shortDate(end)}`],
      right: [input.ownerName, "по московскому времени"],
    });

    this.grid(sheet, input);
    sheet.seal();

    if (input.legend === "teacher") {
      sheet.hand("карандашом — занятия на проверке у администрации", 60, CARD_H - 30, { font: `22px ${HAND}`, color: PENCIL_DARK });
    } else {
      sheet.tick(70, CARD_H - 40);
      sheet.hand("— вы записаны на занятие", 92, CARD_H - 30, { font: `22px ${HAND}`, color: "rgba(140, 29, 44, 0.85)" });
    }

    return sheet.encode();
  }

  public static weekStart(date: Date) {
    const { year, month, day } = MoscowTime.parts(date);
    const midnight = new Date(Date.UTC(year, month - 1, day) - 3 * 60 * 60 * 1000);
    const weekday = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;

    return new Date(midnight.getTime() - weekday * 24 * 60 * 60 * 1000);
  }

  private static grid(sheet: Parchment, input: TimetableInput) {
    const left = 46;
    const right = CARD_W - 46;
    const top = 196;
    const bottom = CARD_H - 74;
    const labelWidth = 130;
    const dayWidth = (right - left - labelWidth) / 7;
    const headerHeight = 78;

    const lessons = input.lessons
      .map((lesson) => {
        const { hour, minute } = MoscowTime.parts(lesson.startsAt);
        const day = Math.floor((lesson.startsAt.getTime() - input.weekStart.getTime()) / (24 * 60 * 60 * 1000));

        return { ...lesson, day, minutes: hour * 60 + minute };
      })
      .filter((lesson) => lesson.day >= 0 && lesson.day < 7);

    const rows = this.rows(lessons.map((lesson) => lesson.minutes), bottom - top - headerHeight);

    sheet.rule(left, top, right, top, 2.2);
    sheet.rule(left, top + 6, right, top + 6, 1, RULE_SOFT);
    sheet.rule(left, bottom, right, bottom, 2.2);
    sheet.rule(left, top, left, bottom, 2);
    sheet.rule(right, top, right, bottom, 2);

    for (let day = 0; day < 7; day++) {
      const x = left + labelWidth + day * dayWidth;
      sheet.rule(x, top, x, bottom, day === 0 ? 2 : 1.3);

      const date = new Date(input.weekStart.getTime() + day * 24 * 60 * 60 * 1000);
      sheet.hand(DAYS[day], x + dayWidth / 2, top + 46, { font: `36px ${SCRIPT}`, color: INK, angle: -0.04, align: "center", maxWidth: dayWidth - 14 });
      sheet.hand(shortDate(date), x + dayWidth / 2, top + 70, { font: `20px ${HAND}`, color: PENCIL, align: "center" });
    }

    sheet.rule(left, top + headerHeight, right, top + headerHeight, 2);

    const rowTop = new Map<Row, number>();
    let y = top + headerHeight;

    for (const row of rows) {
      rowTop.set(row, y);

      if (row.kind === "meal") {
        sheet.band(left + 2, y + 3, right - left - 4, row.height - 6);
        sheet.rule(left, y + 4, right, y + 4, 1, RULE_SOFT);
        sheet.rule(left, y + row.height - 4, right, y + row.height - 4, 1, RULE_SOFT);
        sheet.hand(row.label, (left + right) / 2, y + row.height / 2 + 14, { font: `${Math.min(46, row.height * 0.9)}px ${SCRIPT}`, color: INK, angle: -0.02, align: "center" });
        sheet.flourish((left + right) / 2 - 260, y + row.height / 2, 160);
        sheet.flourish((left + right) / 2 + 100, y + row.height / 2, 160);
      } else {
        sheet.hand(String(row.number), left + 36, y + row.height / 2 + 6, { font: `40px ${CAPS}`, color: INK, align: "center" });
        sheet.hand(row.slot.label, left + 92, y + row.height / 2 + 4, { font: `24px ${HAND}`, color: INK, align: "center", angle: -0.08 });
      }

      y += row.height;
      sheet.rule(left, y, right, y, row.kind === "meal" ? 2 : 1.2);
    }

    if (!lessons.length) {
      const cx = left + labelWidth + (right - left - labelWidth) / 2;
      const cy = (top + headerHeight + bottom) / 2;
      sheet.band(cx - 420, cy - 70, 840, 120);
      sheet.hand("На этой неделе занятий пока нет", cx, cy + 6, { font: `56px ${SCRIPT}`, color: PENCIL_DARK, angle: -0.03, align: "center" });
      sheet.hand("Свободное время — отдыхайте и готовьтесь к следующей", cx, cy + 40, { font: `22px ${HAND}`, color: PENCIL_DARK, align: "center" });
    }

    for (let day = 0; day < 7; day++) {
      const x = left + labelWidth + day * dayWidth;
      const dayLessons = lessons.filter((lesson) => lesson.day === day);

      if (!dayLessons.length) {
        if (lessons.length) {
          const slots = rows.filter((row) => row.kind === "slot");
          const middle = slots[Math.floor((slots.length - 1) / 2)];
          const rowY = rowTop.get(middle)!;

          sheet.hand("Свободное время", x + dayWidth / 2, rowY + middle.height / 2 + 10, {
            font: `32px ${SCRIPT}`, color: PENCIL, angle: -0.14, align: "center", maxWidth: dayWidth - 16,
          });
        }
        continue;
      }

      for (const row of rows) {
        if (row.kind !== "slot") continue;

        const here = dayLessons.filter((lesson) => lesson.minutes === row.slot.minutes);

        if (!here.length) continue;

        const rowY = rowTop.get(row)!;
        const [first] = here;
        const color = first.faded ? "rgba(70, 82, 104, 0.75)" : INKS[hash(first.subjectId) % INKS.length];

        if (!first.faded && (color === "#8c1d2c" || color === "#7a2457")) {
          sheet.wash(x + 2, rowY + 2, dayWidth - 4, row.height - 4, "190, 60, 70");
        }

        const name = here.length > 1 ? `${first.subjectName} +${here.length - 1}` : first.subjectName;
        const topicSpace = row.height >= 110;

        sheet.cellText(name, x + dayWidth / 2, rowY + row.height / 2 - (topicSpace ? 12 : 0), dayWidth - 18, topicSpace ? row.height - 46 : row.height - 14, color);

        if (topicSpace) {
          sheet.hand(first.note, x + dayWidth / 2, rowY + row.height - 16, { font: `17px ${HAND}`, color: PENCIL, align: "center", maxWidth: dayWidth - 16 });
        }

        if (here.some((lesson) => lesson.enrolled)) {
          sheet.tick(x + dayWidth - 22, rowY + 20);
        }
      }
    }
  }

  private static rows(minutes: number[], space: number): Row[] {
    const unique = [...new Set(minutes)].sort((left, right) => left - right).slice(0, 9);
    const slots: Slot[] = unique.length
      ? unique.map((value) => ({ minutes: value, label: `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}` }))
      : [
          { minutes: 10 * 60, label: "10:00" },
          { minutes: 15 * 60, label: "15:00" },
          { minutes: 19 * 60, label: "19:00" },
        ];

    const layout: ({ kind: "meal"; label: string } | { kind: "slot"; slot: Slot; number: number })[] = [];
    let number = 1;

    PERIODS.forEach((period, index) => {
      const from = index === 0 ? 0 : PERIODS[index - 1].until;
      const inside = slots.filter((slot) => slot.minutes >= from && slot.minutes < period.until);

      if (!inside.length) return;

      layout.push({ kind: "meal", label: period.meal });
      for (const slot of inside) layout.push({ kind: "slot", slot, number: number++ });
    });

    const meals = layout.filter((row) => row.kind === "meal").length;
    const mealHeight = 54;
    const slotHeight = (space - meals * mealHeight) / (layout.length - meals);

    return layout.map((row) => ({ ...row, height: row.kind === "meal" ? mealHeight : slotHeight }) as Row);
  }
}
