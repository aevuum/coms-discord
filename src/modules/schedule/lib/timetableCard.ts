import { fileURLToPath } from "node:url";

import {
  createCanvas,
  GlobalFonts,
  loadImage,
  type Image,
  type SKRSContext2D,
} from "@napi-rs/canvas";

import { CharacterFaculty } from "../../../database/generated/prisma/client.js";

import { MoscowTime } from "./moscowTime.js";

export const TIMETABLE_FILE = "timetable.jpg";

const asset = (name: string) => fileURLToPath(new URL(`../../../../assets/schedule/${name}`, import.meta.url));

const SCRIPT = "ComsScript";
const HAND = "ComsHand";
const CAPS = "ComsCaps";

const W = 1800;
const H = 1260;
const CARD_W = 1660;
const CARD_H = 1120;

const PAPER = "#ebdfc3";
const PAPER_LIGHT = "#f4ead3";
const RULE = "rgba(38, 52, 84, 0.78)";
const RULE_SOFT = "rgba(38, 52, 84, 0.45)";
const INK = "#22304f";
const PENCIL = "rgba(70, 82, 104, 0.5)";

const INKS = ["#1f3a6e", "#8c1d2c", "#1d5a3a", "#4b2a6b", "#6b3a1d", "#17506a", "#7a2457"];

const MONTHS = ["янв.", "февр.", "марта", "апр.", "мая", "июня", "июля", "авг.", "сент.", "окт.", "нояб.", "дек."];

const shortDate = (date: Date) => {
  const { day, month } = MoscowTime.parts(date);

  return `${day} ${MONTHS[month - 1]}`;
};

const DAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

const HOUSE_NAMES: Record<CharacterFaculty, string> = {
  [CharacterFaculty.GRYFFINDOR]: "Гриффиндор",
  [CharacterFaculty.SLYTHERIN]: "Слизерин",
  [CharacterFaculty.HUFFLEPUFF]: "Пуффендуй",
  [CharacterFaculty.RAVENCLAW]: "Когтевран",
  [CharacterFaculty.ADULT]: "Взрослые волшебники",
};

const HOUSE_CRESTS: Record<CharacterFaculty, string> = {
  [CharacterFaculty.GRYFFINDOR]: "house_lion.png",
  [CharacterFaculty.SLYTHERIN]: "house_snake.png",
  [CharacterFaculty.HUFFLEPUFF]: "house_badger.png",
  [CharacterFaculty.RAVENCLAW]: "house_eagle.png",
  [CharacterFaculty.ADULT]: "adult_wizard.png",
};

const PERIODS = [
  { until: 12 * 60, meal: "Завтрак" },
  { until: 17 * 60, meal: "Обед" },
  { until: 24 * 60, meal: "Ужин" },
];

export type TimetableLesson = {
  startsAt: Date;
  subjectId: string;
  subjectName: string;
  topic: string;
  enrolled: boolean;
};

export type TimetableInput = {
  faculty: CharacterFaculty;
  characterName: string;
  weekStart: Date;
  lessons: TimetableLesson[];
};

type Slot = { minutes: number; label: string };

type Row = { kind: "meal"; label: string; height: number } | { kind: "slot"; slot: Slot; number: number; height: number };

const random = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const hash = (text: string) => [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 2147483647, 7) || 1;

export class TimetableCard {
  private static fontsReady = false;

  private static crests = new Map<CharacterFaculty, Image | null>();

  public static async render(input: TimetableInput) {
    this.registerFonts();

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const rnd = random(hash(`${input.characterName}:${input.weekStart.toISOString()}`));

    this.backdrop(ctx);

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-0.018);
    ctx.translate(-CARD_W / 2, -CARD_H / 2);

    this.paper(ctx, rnd);
    await this.header(ctx, input, rnd);
    this.grid(ctx, input, rnd);
    this.seal(ctx);

    ctx.restore();

    return canvas.encode("jpeg", 90);
  }

  public static weekStart(date: Date) {
    const { year, month, day } = MoscowTime.parts(date);
    const midnight = new Date(Date.UTC(year, month - 1, day) - 3 * 60 * 60 * 1000);
    const weekday = (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;

    return new Date(midnight.getTime() - weekday * 24 * 60 * 60 * 1000);
  }

  private static registerFonts() {
    if (this.fontsReady) {
      return;
    }

    GlobalFonts.registerFromPath(asset("GreatVibes-Regular.ttf"), SCRIPT);
    GlobalFonts.registerFromPath(asset("MarckScript-Regular.ttf"), HAND);
    GlobalFonts.registerFromPath(asset("CormorantSC-Bold.ttf"), CAPS);
    this.fontsReady = true;
  }

  private static async crest(faculty: CharacterFaculty) {
    if (!this.crests.has(faculty)) {
      this.crests.set(faculty, await loadImage(asset(HOUSE_CRESTS[faculty])).catch(() => null));
    }

    return this.crests.get(faculty) ?? null;
  }

  private static backdrop(ctx: SKRSContext2D) {
    const gradient = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, W * 0.75);
    gradient.addColorStop(0, "#2b3a33");
    gradient.addColorStop(1, "#0d1512");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);
  }

  private static paper(ctx: SKRSContext2D, rnd: () => number) {
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    ctx.restore();

    const light = ctx.createRadialGradient(CARD_W * 0.45, CARD_H * 0.4, 100, CARD_W * 0.5, CARD_H * 0.5, CARD_W * 0.75);
    light.addColorStop(0, PAPER_LIGHT);
    light.addColorStop(0.6, PAPER);
    light.addColorStop(1, "#d6c49d");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, CARD_W, CARD_H);

    for (let i = 0; i < 7; i++) {
      const x = rnd() * CARD_W;
      const y = rnd() * CARD_H;
      const r = 80 + rnd() * 220;
      const stain = ctx.createRadialGradient(x, y, 0, x, y, r);
      stain.addColorStop(0, `rgba(150, 105, 55, ${0.05 + rnd() * 0.06})`);
      stain.addColorStop(0.7, "rgba(150, 105, 55, 0.02)");
      stain.addColorStop(1, "rgba(150, 105, 55, 0)");
      ctx.fillStyle = stain;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    for (let i = 0; i < 14000; i++) {
      const shade = rnd() > 0.5 ? "60, 45, 25" : "255, 250, 235";
      ctx.fillStyle = `rgba(${shade}, ${rnd() * 0.07})`;
      ctx.fillRect(rnd() * CARD_W, rnd() * CARD_H, 1 + rnd() * 2, 1 + rnd() * 2);
    }

    ctx.lineWidth = 1;
    for (let i = 0; i < 260; i++) {
      const x = rnd() * CARD_W;
      const y = rnd() * CARD_H;
      ctx.strokeStyle = `rgba(110, 85, 50, ${0.04 + rnd() * 0.05})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + rnd() * 20 - 10, y + rnd() * 20 - 10, x + rnd() * 40 - 20, y + rnd() * 40 - 20);
      ctx.stroke();
    }

    const edge = (x0: number, y0: number, x1: number, y1: number) => {
      const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
      gradient.addColorStop(0, "rgba(120, 85, 40, 0.28)");
      gradient.addColorStop(1, "rgba(120, 85, 40, 0)");
      return gradient;
    };

    ctx.fillStyle = edge(0, 0, 60, 0);
    ctx.fillRect(0, 0, 60, CARD_H);
    ctx.fillStyle = edge(CARD_W, 0, CARD_W - 60, 0);
    ctx.fillRect(CARD_W - 60, 0, 60, CARD_H);
    ctx.fillStyle = edge(0, 0, 0, 60);
    ctx.fillRect(0, 0, CARD_W, 60);
    ctx.fillStyle = edge(0, CARD_H, 0, CARD_H - 60);
    ctx.fillRect(0, CARD_H - 60, CARD_W, 60);
  }

  private static async header(ctx: SKRSContext2D, input: TimetableInput, rnd: () => number) {
    const title = HOUSE_NAMES[input.faculty].toUpperCase();
    const size = input.faculty === CharacterFaculty.ADULT ? 54 : 72;

    ctx.font = `${size}px ${CAPS}`;
    const spacing = size * 0.12;
    const width = [...title].reduce((sum, char) => sum + ctx.measureText(char).width + spacing, -spacing);
    let x = CARD_W / 2 - width / 2;
    const y = 112;

    ctx.fillStyle = INK;
    ctx.textBaseline = "alphabetic";
    for (const char of title) {
      ctx.globalAlpha = 0.86 + rnd() * 0.14;
      ctx.fillText(char, x, y + (rnd() - 0.5) * 2);
      x += ctx.measureText(char).width + spacing;
    }
    ctx.globalAlpha = 1;

    const crest = await this.crest(input.faculty);

    if (crest) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.85;
      for (const [cx, angle] of [[CARD_W / 2 - width / 2 - 70, -0.12], [CARD_W / 2 + width / 2 + 70, 0.12]] as const) {
        ctx.save();
        ctx.translate(cx, y - size * 0.32);
        ctx.rotate(angle);
        ctx.drawImage(crest, -40, -40, 80, 80);
        ctx.restore();
      }
      ctx.restore();
    }

    this.flourish(ctx, CARD_W / 2 - 300, y + 30, 600, rnd);

    const end = new Date(input.weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    const [from, to] = [shortDate(input.weekStart), shortDate(end)];

    this.hand(ctx, "Расписание занятий", 70, 92, { font: `46px ${SCRIPT}`, color: INK, angle: -0.05 });
    this.hand(ctx, `неделя ${from} — ${to}`, 76, 134, { font: `26px ${HAND}`, color: PENCIL.replace("0.5", "0.85"), angle: -0.05 });
    this.hand(ctx, input.characterName, CARD_W - 80, 92, { font: `48px ${SCRIPT}`, color: "#6b2330", angle: 0.05, align: "right", maxWidth: 420 });
    this.hand(ctx, "по московскому времени", CARD_W - 84, 134, { font: `24px ${HAND}`, color: PENCIL.replace("0.5", "0.85"), angle: 0.05, align: "right" });
  }

  private static grid(ctx: SKRSContext2D, input: TimetableInput, rnd: () => number) {
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

    this.rule(ctx, left, top, right, top, 2.2, rnd);
    this.rule(ctx, left, top + 6, right, top + 6, 1, rnd, RULE_SOFT);
    this.rule(ctx, left, bottom, right, bottom, 2.2, rnd);
    this.rule(ctx, left, top, left, bottom, 2, rnd);
    this.rule(ctx, right, top, right, bottom, 2, rnd);

    for (let day = 0; day < 7; day++) {
      const x = left + labelWidth + day * dayWidth;
      this.rule(ctx, x, top, x, bottom, day === 0 ? 2 : 1.3, rnd);

      const date = new Date(input.weekStart.getTime() + day * 24 * 60 * 60 * 1000);
      this.hand(ctx, DAYS[day], x + dayWidth / 2, top + 46, { font: `36px ${SCRIPT}`, color: INK, angle: -0.04, align: "center", maxWidth: dayWidth - 14 });
      this.hand(ctx, shortDate(date), x + dayWidth / 2, top + 70, { font: `20px ${HAND}`, color: PENCIL, align: "center" });
    }

    this.rule(ctx, left, top + headerHeight, right, top + headerHeight, 2, rnd);

    const rowTop = new Map<Row, number>();
    let y = top + headerHeight;

    for (const row of rows) {
      rowTop.set(row, y);

      if (row.kind === "meal") {
        ctx.save();
        ctx.fillStyle = "rgba(235, 223, 195, 0.96)";
        ctx.fillRect(left + 2, y + 3, right - left - 4, row.height - 6);
        ctx.restore();
        this.rule(ctx, left, y + 4, right, y + 4, 1, rnd, RULE_SOFT);
        this.rule(ctx, left, y + row.height - 4, right, y + row.height - 4, 1, rnd, RULE_SOFT);
        this.hand(ctx, row.label, (left + right) / 2, y + row.height / 2 + 14, { font: `${Math.min(46, row.height * 0.9)}px ${SCRIPT}`, color: INK, angle: -0.02, align: "center" });
        this.flourish(ctx, (left + right) / 2 - 260, y + row.height / 2, 160, rnd);
        this.flourish(ctx, (left + right) / 2 + 100, y + row.height / 2, 160, rnd);
      } else {
        this.hand(ctx, String(row.number), left + 36, y + row.height / 2 + 6, { font: `40px ${CAPS}`, color: INK, align: "center" });
        this.hand(ctx, row.slot.label, left + 92, y + row.height / 2 + 4, { font: `24px ${HAND}`, color: INK, align: "center", angle: -0.08 });
      }

      y += row.height;
      this.rule(ctx, left, y, right, y, row.kind === "meal" ? 2 : 1.2, rnd);
    }

    if (!lessons.length) {
      const cx = left + labelWidth + (right - left - labelWidth) / 2;
      const cy = (top + headerHeight + bottom) / 2;
      ctx.save();
      ctx.fillStyle = "rgba(240, 230, 205, 0.92)";
      ctx.fillRect(cx - 420, cy - 70, 840, 120);
      ctx.restore();
      this.hand(ctx, "На этой неделе занятий пока нет", cx, cy + 6, { font: `56px ${SCRIPT}`, color: PENCIL.replace("0.5", "0.8"), angle: -0.03, align: "center" });
      this.hand(ctx, "Свободное время — отдыхайте и готовьтесь к следующей", cx, cy + 40, { font: `22px ${HAND}`, color: PENCIL.replace("0.5", "0.8"), align: "center" });
    }

    for (let day = 0; day < 7; day++) {
      const x = left + labelWidth + day * dayWidth;
      const dayLessons = lessons.filter((lesson) => lesson.day === day);

      if (!dayLessons.length) {
        if (lessons.length) {
          const slots = rows.filter((row) => row.kind === "slot");
          const middle = slots[Math.floor((slots.length - 1) / 2)];
          const rowY = rowTop.get(middle)!;

          this.hand(ctx, "Свободное время", x + dayWidth / 2, rowY + middle.height / 2 + 10, {
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
        const color = INKS[hash(first.subjectId) % INKS.length];

        if (color === "#8c1d2c" || color === "#7a2457") {
          const cx = x + dayWidth / 2;
          const cy = rowY + row.height / 2;
          const wash = ctx.createRadialGradient(cx, cy, 4, cx, cy, dayWidth * 0.55);
          wash.addColorStop(0, "rgba(190, 60, 70, 0.16)");
          wash.addColorStop(1, "rgba(190, 60, 70, 0)");
          ctx.fillStyle = wash;
          ctx.fillRect(x + 2, rowY + 2, dayWidth - 4, row.height - 4);
        }

        const name = here.length > 1 ? `${first.subjectName} +${here.length - 1}` : first.subjectName;
        const topicSpace = row.height >= 110;

        this.cellText(ctx, name, x + dayWidth / 2, rowY + row.height / 2 - (topicSpace ? 12 : 0), dayWidth - 18, topicSpace ? row.height - 46 : row.height - 14, color, rnd);

        if (topicSpace) {
          this.hand(ctx, first.topic, x + dayWidth / 2, rowY + row.height - 16, { font: `17px ${HAND}`, color: PENCIL, align: "center", maxWidth: dayWidth - 16 });
        }

        if (here.some((lesson) => lesson.enrolled)) {
          this.tick(ctx, x + dayWidth - 22, rowY + 20);
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

  private static cellText(ctx: SKRSContext2D, text: string, cx: number, cy: number, maxWidth: number, maxHeight: number, color: string, rnd: () => number) {
    for (let size = 40; size >= 20; size -= 2) {
      ctx.font = `${size}px ${SCRIPT}`;
      const lines = this.wrap(ctx, text, maxWidth);
      const lineHeight = size * 1.02;

      if (lines.length * lineHeight > maxHeight && size > 20) continue;
      if (lines.some((line) => ctx.measureText(line).width > maxWidth) && size > 20) continue;

      const startY = cy - ((lines.length - 1) * lineHeight) / 2 + size * 0.3;
      lines.forEach((line, index) => {
        this.hand(ctx, line, cx + (rnd() - 0.5) * 6, startY + index * lineHeight + (rnd() - 0.5) * 3, {
          font: `${size}px ${SCRIPT}`, color, angle: -0.06 + (rnd() - 0.5) * 0.05, align: "center", maxWidth,
        });
      });
      return;
    }
  }

  private static wrap(ctx: SKRSContext2D, text: string, maxWidth: number) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";

    for (const word of words) {
      const next = line ? `${line} ${word}` : word;

      if (ctx.measureText(next).width <= maxWidth || !line) {
        line = next;
      } else {
        lines.push(line);
        line = word;
      }
    }

    if (line) lines.push(line);

    return lines.slice(0, 3);
  }

  private static hand(
    ctx: SKRSContext2D,
    text: string,
    x: number,
    y: number,
    options: { font: string; color: string; angle?: number; align?: CanvasTextAlign; maxWidth?: number },
  ) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(options.angle ?? 0);
    ctx.font = options.font;
    ctx.textAlign = options.align ?? "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = options.color;
    ctx.globalAlpha = 0.35;
    ctx.fillText(text, 0.8, 0.9, options.maxWidth);
    ctx.globalAlpha = 0.92;
    ctx.fillText(text, 0, 0, options.maxWidth);
    ctx.restore();
  }

  private static rule(ctx: SKRSContext2D, x0: number, y0: number, x1: number, y1: number, width: number, rnd: () => number, color = RULE) {
    const length = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(2, Math.round(length / 60));

    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const jitter = i === steps ? 0 : (rnd() - 0.5) * 1.6;
      const x = x0 + (x1 - x0) * t + (y0 === y1 ? 0 : jitter);
      const y = y0 + (y1 - y0) * t + (y0 === y1 ? jitter : 0);
      ctx.lineTo(x, y);
    }

    ctx.stroke();
    ctx.restore();
  }

  private static flourish(ctx: SKRSContext2D, x: number, y: number, width: number, rnd: () => number) {
    ctx.save();
    ctx.strokeStyle = RULE_SOFT;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + width * 0.3, y - 10 - rnd() * 6, x + width * 0.6, y + 10 + rnd() * 6, x + width, y);
    ctx.stroke();
    ctx.restore();
  }

  private static tick(ctx: SKRSContext2D, x: number, y: number) {
    ctx.save();
    ctx.strokeStyle = "rgba(140, 29, 44, 0.85)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - 10, y);
    ctx.quadraticCurveTo(x - 6, y + 4, x - 3, y + 9);
    ctx.quadraticCurveTo(x + 2, y - 4, x + 12, y - 12);
    ctx.stroke();
    ctx.restore();
  }

  private static seal(ctx: SKRSContext2D) {
    const x = CARD_W - 118;
    const y = CARD_H - 40;

    ctx.save();
    const wax = ctx.createRadialGradient(x - 8, y - 8, 4, x, y, 34);
    wax.addColorStop(0, "#b8333d");
    wax.addColorStop(1, "#6e1520");
    ctx.fillStyle = wax;
    ctx.beginPath();
    for (let i = 0; i <= 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const radius = 30 + (i % 2 ? 3 : 0);
      ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
    }
    ctx.fill();
    ctx.font = `30px ${CAPS}`;
    ctx.fillStyle = "rgba(255, 210, 200, 0.55)";
    ctx.textAlign = "center";
    ctx.fillText("C", x, y + 10);
    ctx.restore();

    this.hand(ctx, "Администрация школы", CARD_W - 180, CARD_H - 30, { font: `30px ${SCRIPT}`, color: INK, align: "right", angle: -0.03 });
    this.tick(ctx, 70, CARD_H - 40);
    this.hand(ctx, "— вы записаны на занятие", 92, CARD_H - 30, { font: `22px ${HAND}`, color: "rgba(140, 29, 44, 0.85)" });
  }
}
