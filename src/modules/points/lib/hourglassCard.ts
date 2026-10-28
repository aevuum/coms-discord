import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";

import { CharacterFaculty } from "../../../database/generated/prisma/client.js";

import { MoscowTime } from "../../schedule/lib/moscowTime.js";
import { CAPS, HAND, Parchment, SCRIPT } from "../../schedule/lib/parchment.js";
import { HOUSE_LABELS, HOUSES, type House } from "../types/points.js";

export const HOURGLASS_FILE = "house-points.jpg";

const W = 1800;
const H = 1120;

type Style = {
  sand: [string, string, string];
  metal: [string, string, string];
  glow: string;
  gem: string;
  frame: "pillars" | "serpent" | "slender" | "branches";
};

const STYLES: Record<House, Style> = {
  [CharacterFaculty.GRYFFINDOR]: {
    sand: ["#7d0f1a", "#c8202f", "#ff7a7a"],
    metal: ["#6b5222", "#e2c26a", "#8a6a2c"],
    glow: "rgba(255, 90, 80, 0.22)",
    gem: "#d4283a",
    frame: "pillars",
  },
  [CharacterFaculty.SLYTHERIN]: {
    sand: ["#0b4a2a", "#1f9e5a", "#8dffbf"],
    metal: ["#4c5559", "#d7dee2", "#6e787d"],
    glow: "rgba(80, 255, 160, 0.18)",
    gem: "#22b067",
    frame: "serpent",
  },
  [CharacterFaculty.RAVENCLAW]: {
    sand: ["#10265e", "#2a5fd0", "#a9c8ff"],
    metal: ["#5c4a24", "#d8b46a", "#7d6430"],
    glow: "rgba(90, 150, 255, 0.2)",
    gem: "#3b78e0",
    frame: "slender",
  },
  [CharacterFaculty.HUFFLEPUFF]: {
    sand: ["#7a4a08", "#f0a92a", "#ffe49a"],
    metal: ["#3f2a14", "#9c7444", "#5a3c1e"],
    glow: "rgba(255, 190, 80, 0.2)",
    gem: "#f2a51c",
    frame: "branches",
  },
};

const random = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

export type HourglassEntry = { faculty: House; points: number };

export class HourglassCard {
  public static scale(points: number[]) {
    const top = Math.max(0, ...points);

    return Math.max(100, Math.ceil((top * 1.15) / 50) * 50);
  }

  public static async render(entries: HourglassEntry[], updatedAt = new Date()) {
    Parchment.registerFonts();

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const rnd = random(20261028);
    const max = this.scale(entries.map((entry) => entry.points));
    const leader = Math.max(...entries.map((entry) => entry.points));

    this.backdrop(ctx, rnd);

    ctx.textAlign = "center";
    ctx.fillStyle = "#e8dcc0";
    ctx.font = `64px ${CAPS}`;
    ctx.shadowColor = "rgba(243, 194, 107, 0.45)";
    ctx.shadowBlur = 18;
    ctx.fillText("ОЧКИ ФАКУЛЬТЕТОВ", W / 2, 96);
    ctx.shadowBlur = 0;
    ctx.font = `26px ${HAND}`;
    ctx.fillStyle = "rgba(232, 220, 192, 0.65)";
    ctx.fillText(`обновлено ${MoscowTime.format(updatedAt)} МСК`, W / 2, 138);

    const order = HOUSES.map((faculty) => entries.find((entry) => entry.faculty === faculty) ?? { faculty, points: 0 });
    const step = W / order.length;

    for (const [index, entry] of order.entries()) {
      const cx = step * index + step / 2;
      await this.hourglass(ctx, cx, 250, 940, entry, Math.max(0, Math.min(1, entry.points / max)), entry.points === leader && leader > 0, rnd);
    }

    return canvas.encode("jpeg", 90);
  }

  private static backdrop(ctx: SKRSContext2D, rnd: () => number) {
    const base = ctx.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, "#141c1a");
    base.addColorStop(1, "#0a0f0e");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = `rgba(255, 255, 255, ${rnd() * 0.025})`;
      ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 2);
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 2;
    for (let y = 180; y < H; y += 90) {
      const offset = (y / 90) % 2 ? 0 : 110;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      for (let x = offset; x < W; x += 220) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 90);
        ctx.stroke();
      }
    }

    const vignette = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, W * 0.7);
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.7)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
  }

  private static metal(ctx: SKRSContext2D, style: Style, x0: number, x1: number) {
    const gradient = ctx.createLinearGradient(x0, 0, x1, 0);
    gradient.addColorStop(0, style.metal[0]);
    gradient.addColorStop(0.45, style.metal[1]);
    gradient.addColorStop(1, style.metal[2]);
    return gradient;
  }

  private static profile(u: number) {
    return Math.pow(Math.max(0, 1 - Math.pow(u, 2.3)), 0.85);
  }

  private static bulbPath(ctx: SKRSContext2D, cx: number, top: number, mid: number, bottom: number, radius: number, neck: number) {
    const steps = 40;
    const upper = mid - top;
    const lower = bottom - mid;

    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      ctx.lineTo(cx - (neck + (radius - neck) * this.profile(u)), top + u * upper);
    }
    for (let i = 1; i <= steps; i++) {
      const u = i / steps;
      ctx.lineTo(cx - (neck + (radius - neck) * this.profile(1 - u)), mid + u * lower);
    }
    for (let i = steps; i >= 0; i--) {
      const u = i / steps;
      ctx.lineTo(cx + (neck + (radius - neck) * this.profile(1 - u)), mid + u * lower);
    }
    for (let i = steps - 1; i >= 0; i--) {
      const u = i / steps;
      ctx.lineTo(cx + (neck + (radius - neck) * this.profile(u)), top + u * upper);
    }
    ctx.closePath();
  }

  private static sand(ctx: SKRSContext2D, style: Style, x: number, y: number, width: number, height: number, rnd: () => number, shape: () => void) {
    ctx.save();
    shape();
    ctx.clip();

    const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
    gradient.addColorStop(0, style.sand[0]);
    gradient.addColorStop(0.5, style.sand[1]);
    gradient.addColorStop(1, style.sand[0]);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);

    const count = Math.round((width * height) / 18);
    for (let i = 0; i < count; i++) {
      const bright = rnd() > 0.8;
      ctx.fillStyle = bright ? style.sand[2] : rnd() > 0.5 ? style.sand[0] : style.sand[1];
      ctx.globalAlpha = bright ? 0.9 : 0.6;
      ctx.beginPath();
      ctx.arc(x + rnd() * width, y + rnd() * height, bright ? 1.4 + rnd() * 1.6 : 1 + rnd() * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private static async hourglass(
    ctx: SKRSContext2D,
    cx: number,
    top: number,
    bottom: number,
    entry: HourglassEntry,
    fill: number,
    leader: boolean,
    rnd: () => number,
  ) {
    const style = STYLES[entry.faculty];
    const radius = 92;
    const neck = 9;
    const glassTop = top + 70;
    const glassBottom = bottom - 120;
    const mid = (glassTop + glassBottom) / 2;
    const half = glassBottom - mid;

    if (leader) {
      const halo = ctx.createRadialGradient(cx, mid, 40, cx, mid, 330);
      halo.addColorStop(0, style.glow);
      halo.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = halo;
      ctx.fillRect(cx - 340, mid - 340, 680, 680);
    }

    this.frame(ctx, style, cx, glassTop, glassBottom, radius, rnd);

    ctx.save();
    this.bulbPath(ctx, cx, glassTop, mid, glassBottom, radius, neck);
    ctx.fillStyle = "rgba(200, 230, 255, 0.05)";
    ctx.fill();
    ctx.clip();

    const lowerLevel = glassBottom - fill * half * 0.96;

    if (fill > 0) {
      this.sand(ctx, style, cx - radius, lowerLevel - 30, radius * 2, glassBottom - lowerLevel + 30, rnd, () => {
        ctx.beginPath();
        ctx.moveTo(cx - radius, glassBottom + 2);
        ctx.lineTo(cx - radius, lowerLevel + 10);
        ctx.quadraticCurveTo(cx, lowerLevel - 30, cx + radius, lowerLevel + 10);
        ctx.lineTo(cx + radius, glassBottom + 2);
        ctx.closePath();
      });
    }

    const upperFill = fill >= 1 ? 0 : Math.max(0.08, 0.85 * (1 - fill));
    const upperLevel = mid - upperFill * half;

    if (upperFill > 0) {
      this.sand(ctx, style, cx - radius, upperLevel - 4, radius * 2, mid - upperLevel + 8, rnd, () => {
        ctx.beginPath();
        ctx.moveTo(cx - radius, upperLevel - 4);
        ctx.quadraticCurveTo(cx, upperLevel + 24, cx + radius, upperLevel - 4);
        ctx.lineTo(cx + radius, mid + 4);
        ctx.lineTo(cx - radius, mid + 4);
        ctx.closePath();
      });
    }

    if (upperFill > 0 && fill < 1) {
      ctx.strokeStyle = style.sand[1];
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(cx, mid);
      ctx.lineTo(cx, lowerLevel - (fill > 0 ? 20 : 0));
      ctx.stroke();
      ctx.globalAlpha = 1;
      for (let i = 0; i < 18; i++) {
        ctx.fillStyle = style.sand[2];
        ctx.beginPath();
        ctx.arc(cx + (rnd() - 0.5) * 6, mid + rnd() * (lowerLevel - mid - 20), 1 + rnd() * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    ctx.save();
    this.bulbPath(ctx, cx, glassTop, mid, glassBottom, radius, neck);
    ctx.strokeStyle = "rgba(225, 240, 255, 0.45)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.62, glassTop + 30);
    ctx.quadraticCurveTo(cx - radius * 0.78, glassTop + half * 0.45, cx - radius * 0.3, mid - 40);
    ctx.moveTo(cx - radius * 0.3, mid + 50);
    ctx.quadraticCurveTo(cx - radius * 0.8, mid + half * 0.55, cx - radius * 0.6, glassBottom - 30);
    ctx.stroke();
    ctx.restore();

    this.caps(ctx, style, cx, glassTop, glassBottom, radius);

    const crest = await Parchment.crest(entry.faculty);

    if (crest) {
      ctx.save();
      ctx.shadowColor = style.glow.replace(/0\.\d+\)$/, "0.8)");
      ctx.shadowBlur = 24;
      ctx.drawImage(crest, cx - 62, glassTop - 196, 124, 124);
      ctx.restore();
    }

    ctx.textAlign = "center";
    ctx.font = `76px ${CAPS}`;
    ctx.fillStyle = "#f1e6cc";
    ctx.shadowColor = style.glow.replace(/0\.\d+\)$/, "0.9)");
    ctx.shadowBlur = leader ? 22 : 10;
    ctx.fillText(String(entry.points), cx, bottom + 44);
    ctx.shadowBlur = 0;
    ctx.font = `40px ${SCRIPT}`;
    ctx.fillStyle = style.sand[2];
    ctx.fillText(HOUSE_LABELS[entry.faculty], cx, bottom + 94);
  }

  private static caps(ctx: SKRSContext2D, style: Style, cx: number, glassTop: number, glassBottom: number, radius: number) {
    const plate = (y: number, width: number, height: number) => {
      ctx.fillStyle = this.metal(ctx, style, cx - width / 2, cx + width / 2);
      ctx.beginPath();
      ctx.roundRect(cx - width / 2, y, width, height, height / 2.4);
      ctx.fill();
      ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    plate(glassTop - 22, radius * 2 + 70, 24);
    plate(glassTop - 46, radius * 2 + 30, 26);
    plate(glassTop - 66, radius * 1.2, 22);

    ctx.fillStyle = style.gem;
    ctx.shadowColor = style.gem;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.ellipse(cx, glassTop - 34, 10, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    plate(glassBottom - 2, radius * 2 + 70, 24);
    plate(glassBottom + 20, radius * 2 + 30, 26);

    ctx.fillStyle = this.metal(ctx, style, cx - radius - 50, cx + radius + 50);
    ctx.beginPath();
    ctx.moveTo(cx - radius - 30, glassBottom + 46);
    ctx.lineTo(cx + radius + 30, glassBottom + 46);
    ctx.lineTo(cx + radius + 50, glassBottom + 92);
    ctx.lineTo(cx - radius - 50, glassBottom + 92);
    ctx.closePath();
    ctx.fill();

    for (const dx of [-radius - 34, radius + 34]) {
      ctx.beginPath();
      ctx.ellipse(cx + dx, glassBottom + 100, 16, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private static frame(ctx: SKRSContext2D, style: Style, cx: number, glassTop: number, glassBottom: number, radius: number, rnd: () => number) {
    const left = cx - radius - 30;
    const right = cx + radius + 30;
    const top = glassTop - 22;
    const bottom = glassBottom + 22;

    const pillar = (x: number, width: number) => {
      ctx.fillStyle = this.metal(ctx, style, x - width / 2, x + width / 2);
      ctx.fillRect(x - width / 2, top, width, bottom - top);

      for (const t of [0.22, 0.5, 0.78]) {
        ctx.beginPath();
        ctx.ellipse(x, top + (bottom - top) * t, width * 0.95, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    switch (style.frame) {
      case "pillars":
        pillar(left, 18);
        pillar(right, 18);
        ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
        ctx.lineWidth = 1;
        for (const x of [left, right]) {
          for (const dx of [-4, 0, 4]) {
            ctx.beginPath();
            ctx.moveTo(x + dx, top + 10);
            ctx.lineTo(x + dx, bottom - 10);
            ctx.stroke();
          }
        }
        break;

      case "slender":
        pillar(left, 10);
        pillar(right, 10);
        for (let i = 0; i < 10; i++) {
          ctx.fillStyle = "rgba(200, 220, 255, 0.8)";
          ctx.beginPath();
          ctx.arc(cx + (rnd() - 0.5) * radius * 3, top + rnd() * (bottom - top), 1 + rnd() * 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
        break;

      case "serpent":
        pillar(left, 8);
        pillar(right, 8);
        ctx.lineCap = "round";
        for (const phase of [0, Math.PI]) {
          ctx.strokeStyle = this.metal(ctx, style, left, right);
          ctx.lineWidth = 9;
          ctx.beginPath();
          for (let y = top + 10; y <= bottom - 10; y += 6) {
            const t = (y - top) / (bottom - top);
            const x = cx + Math.sin(t * Math.PI * 3 + phase) * (radius + 26);
            if (y === top + 10) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.fillStyle = style.gem;
        ctx.beginPath();
        ctx.ellipse(cx + Math.sin(Math.PI * 3) * (radius + 26), bottom - 10, 9, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        break;

      case "branches":
        ctx.lineCap = "round";
        for (const side of [-1, 1]) {
          ctx.strokeStyle = this.metal(ctx, style, cx + side * radius, cx + side * (radius + 40));
          ctx.lineWidth = 12;
          ctx.beginPath();
          ctx.moveTo(cx + side * (radius + 30), bottom);
          ctx.bezierCurveTo(cx + side * (radius + 70), bottom - 160, cx + side * (radius - 10), top + 260, cx + side * (radius + 40), top + 120);
          ctx.bezierCurveTo(cx + side * (radius + 60), top + 60, cx + side * (radius + 10), top + 20, cx + side * (radius + 26), top);
          ctx.stroke();
          ctx.fillStyle = "#6f8a3a";
          for (const [t, angle] of [[0.25, 0.6], [0.5, -0.5], [0.72, 0.8]] as const) {
            const y = top + (bottom - top) * t;
            ctx.save();
            ctx.translate(cx + side * (radius + 46), y);
            ctx.rotate(side * angle);
            ctx.beginPath();
            ctx.ellipse(0, 0, 16, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
        break;
    }
  }
}
