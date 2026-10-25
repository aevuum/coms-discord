import { fileURLToPath } from "node:url";

import {
  createCanvas,
  GlobalFonts,
  loadImage,
  type Canvas,
  type Image,
  type SKRSContext2D,
} from "@napi-rs/canvas";

import { CharacterFaculty } from "../../../database/generated/prisma/client.js";

const asset = (name: string) => fileURLToPath(new URL(`../../../../assets/schedule/${name}`, import.meta.url));

export const SCRIPT = "ComsScript";
export const HAND = "ComsHand";
export const CAPS = "ComsCaps";

export const RULE = "rgba(38, 52, 84, 0.78)";
export const RULE_SOFT = "rgba(38, 52, 84, 0.45)";
export const INK = "#22304f";
export const PENCIL = "rgba(70, 82, 104, 0.5)";
export const PENCIL_DARK = "rgba(70, 82, 104, 0.85)";
export const CRIMSON = "#8c1d2c";
export const INKS = ["#1f3a6e", "#8c1d2c", "#1d5a3a", "#4b2a6b", "#6b3a1d", "#17506a", "#7a2457"];

const PAPER = "#ebdfc3";
const PAPER_LIGHT = "#f4ead3";
const MARGIN = 70;

export const HOUSE_NAMES: Record<CharacterFaculty, string> = {
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

export const hash = (text: string) => [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 2147483647, 7) || 1;

const random = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

export type HandOptions = { font: string; color: string; angle?: number; align?: CanvasTextAlign; maxWidth?: number };

export type SheetHeader = {
  title: string;
  crest: CharacterFaculty | null;
  left: [string, string];
  right: [string, string];
};

export class Parchment {
  private static fontsReady = false;

  private static crests = new Map<CharacterFaculty, Image | null>();

  public readonly rnd: () => number;

  private constructor(
    private readonly canvas: Canvas,
    public readonly ctx: SKRSContext2D,
    public readonly width: number,
    public readonly height: number,
    seed: string,
  ) {
    this.rnd = random(hash(seed));
  }

  public static create(width: number, height: number, seed: string, tilt = -0.018) {
    this.registerFonts();

    const canvas = createCanvas(width + MARGIN * 2, height + MARGIN * 2);
    const ctx = canvas.getContext("2d");
    const sheet = new Parchment(canvas, ctx, width, height, seed);

    sheet.backdrop();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(tilt);
    ctx.translate(-width / 2, -height / 2);
    sheet.paper();

    return sheet;
  }

  public encode() {
    return this.canvas.encode("jpeg", 90);
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

  public static async crest(faculty: CharacterFaculty) {
    if (!this.crests.has(faculty)) {
      this.crests.set(faculty, await loadImage(asset(HOUSE_CRESTS[faculty])).catch(() => null));
    }

    return this.crests.get(faculty) ?? null;
  }

  private backdrop() {
    const { ctx } = this;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const gradient = ctx.createRadialGradient(w / 2, h / 2, 200, w / 2, h / 2, w * 0.75);
    gradient.addColorStop(0, "#2b3a33");
    gradient.addColorStop(1, "#0d1512");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  private paper() {
    const { ctx, rnd, width: W, height: H } = this;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
    ctx.shadowBlur = 50;
    ctx.shadowOffsetY = 18;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    const light = ctx.createRadialGradient(W * 0.45, H * 0.4, 100, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    light.addColorStop(0, PAPER_LIGHT);
    light.addColorStop(0.6, PAPER);
    light.addColorStop(1, "#d6c49d");
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 7; i++) {
      const x = rnd() * W;
      const y = rnd() * H;
      const r = 80 + rnd() * 220;
      const stain = ctx.createRadialGradient(x, y, 0, x, y, r);
      stain.addColorStop(0, `rgba(150, 105, 55, ${0.05 + rnd() * 0.06})`);
      stain.addColorStop(0.7, "rgba(150, 105, 55, 0.02)");
      stain.addColorStop(1, "rgba(150, 105, 55, 0)");
      ctx.fillStyle = stain;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    const specks = Math.round((W * H) / 130);
    for (let i = 0; i < specks; i++) {
      const shade = rnd() > 0.5 ? "60, 45, 25" : "255, 250, 235";
      ctx.fillStyle = `rgba(${shade}, ${rnd() * 0.07})`;
      ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 2);
    }

    ctx.lineWidth = 1;
    for (let i = 0; i < Math.round((W * H) / 7000); i++) {
      const x = rnd() * W;
      const y = rnd() * H;
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
    ctx.fillRect(0, 0, 60, H);
    ctx.fillStyle = edge(W, 0, W - 60, 0);
    ctx.fillRect(W - 60, 0, 60, H);
    ctx.fillStyle = edge(0, 0, 0, 60);
    ctx.fillRect(0, 0, W, 60);
    ctx.fillStyle = edge(0, H, 0, H - 60);
    ctx.fillRect(0, H - 60, W, 60);
  }

  public async header(header: SheetHeader) {
    const { ctx, rnd, width: W } = this;
    const title = header.title.toUpperCase();
    const size = title.length > 12 ? 54 : 72;

    ctx.font = `${size}px ${CAPS}`;
    const spacing = size * 0.12;
    const width = [...title].reduce((sum, char) => sum + ctx.measureText(char).width + spacing, -spacing);
    let x = W / 2 - width / 2;
    const y = 112;

    ctx.fillStyle = INK;
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    for (const char of title) {
      ctx.globalAlpha = 0.86 + rnd() * 0.14;
      ctx.fillText(char, x, y + (rnd() - 0.5) * 2);
      x += ctx.measureText(char).width + spacing;
    }
    ctx.globalAlpha = 1;

    const crest = header.crest ? await Parchment.crest(header.crest) : null;

    if (crest) {
      ctx.save();
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.85;
      for (const [cx, angle] of [[W / 2 - width / 2 - 70, -0.12], [W / 2 + width / 2 + 70, 0.12]] as const) {
        ctx.save();
        ctx.translate(cx, y - size * 0.32);
        ctx.rotate(angle);
        ctx.drawImage(crest, -40, -40, 80, 80);
        ctx.restore();
      }
      ctx.restore();
    }

    this.flourish(W / 2 - 300, y + 30, 600);

    const room = W / 2 - width / 2 - 210;
    const fit = (text: string, largest: number) => {
      for (let size = largest; size > 24; size -= 2) {
        ctx.font = `${size}px ${SCRIPT}`;
        if (ctx.measureText(text).width <= room) return size;
      }
      return 24;
    };

    this.hand(header.left[0], 70, 92, { font: `${fit(header.left[0], 46)}px ${SCRIPT}`, color: INK, angle: -0.05, maxWidth: room });
    this.hand(header.left[1], 76, 134, { font: `26px ${HAND}`, color: PENCIL_DARK, angle: -0.05 });
    this.hand(header.right[0], W - 80, 92, { font: `${fit(header.right[0], 48)}px ${SCRIPT}`, color: "#6b2330", angle: 0.05, align: "right", maxWidth: room });
    this.hand(header.right[1], W - 84, 134, { font: `24px ${HAND}`, color: PENCIL_DARK, angle: 0.05, align: "right" });
  }

  public hand(text: string, x: number, y: number, options: HandOptions) {
    const { ctx } = this;

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

  public cellText(text: string, cx: number, cy: number, maxWidth: number, maxHeight: number, color: string, largest = 40) {
    const { ctx, rnd } = this;

    for (let size = largest; size >= 20; size -= 2) {
      ctx.font = `${size}px ${SCRIPT}`;
      const lines = this.wrap(text, maxWidth);
      const lineHeight = size * 1.02;

      if (lines.length * lineHeight > maxHeight && size > 20) continue;
      if (lines.some((line) => ctx.measureText(line).width > maxWidth) && size > 20) continue;

      const startY = cy - ((lines.length - 1) * lineHeight) / 2 + size * 0.3;
      lines.forEach((line, index) => {
        this.hand(line, cx + (rnd() - 0.5) * 6, startY + index * lineHeight + (rnd() - 0.5) * 3, {
          font: `${size}px ${SCRIPT}`, color, angle: -0.06 + (rnd() - 0.5) * 0.05, align: "center", maxWidth,
        });
      });
      return;
    }
  }

  private wrap(text: string, maxWidth: number) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";

    for (const word of words) {
      const next = line ? `${line} ${word}` : word;

      if (this.ctx.measureText(next).width <= maxWidth || !line) {
        line = next;
      } else {
        lines.push(line);
        line = word;
      }
    }

    if (line) lines.push(line);

    return lines.slice(0, 3);
  }

  public rule(x0: number, y0: number, x1: number, y1: number, width: number, color = RULE) {
    const { ctx, rnd } = this;
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
      ctx.lineTo(x0 + (x1 - x0) * t + (y0 === y1 ? 0 : jitter), y0 + (y1 - y0) * t + (y0 === y1 ? jitter : 0));
    }

    ctx.stroke();
    ctx.restore();
  }

  public flourish(x: number, y: number, width: number) {
    const { ctx, rnd } = this;

    ctx.save();
    ctx.strokeStyle = RULE_SOFT;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + width * 0.3, y - 10 - rnd() * 6, x + width * 0.6, y + 10 + rnd() * 6, x + width, y);
    ctx.stroke();
    ctx.restore();
  }

  public wash(x: number, y: number, width: number, height: number, rgb: string, strength = 0.16) {
    const { ctx } = this;
    const cx = x + width / 2;
    const cy = y + height / 2;
    const gradient = ctx.createRadialGradient(cx, cy, 4, cx, cy, Math.max(width, height) * 0.55);
    gradient.addColorStop(0, `rgba(${rgb}, ${strength})`);
    gradient.addColorStop(1, `rgba(${rgb}, 0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
  }

  public band(x: number, y: number, width: number, height: number) {
    this.ctx.save();
    this.ctx.fillStyle = "rgba(235, 223, 195, 0.96)";
    this.ctx.fillRect(x, y, width, height);
    this.ctx.restore();
  }

  public tick(x: number, y: number) {
    const { ctx } = this;

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

  public seal(signature = "Администрация школы") {
    const { ctx, width: W, height: H } = this;
    const x = W - 118;
    const y = H - 40;

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

    this.hand(signature, W - 180, H - 30, { font: `30px ${SCRIPT}`, color: INK, align: "right", angle: -0.03 });
  }
}
