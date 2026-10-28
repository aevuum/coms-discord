import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";

import { CharacterFaculty } from "../../../database/generated/prisma/client.js";

import { MoscowTime } from "../../schedule/lib/moscowTime.js";
import { CAPS, HAND, Parchment, SCRIPT } from "../../schedule/lib/parchment.js";
import { HOUSE_LABELS, HOUSES, type House } from "../types/points.js";

export const HOURGLASS_FILE = "house-points.jpg";

const W = 1800;
const H = 1180;
const TAU = Math.PI * 2;

type Metal = { deep: string; base: string; light: string; spec: string };

type Style = {
  sand: { deep: string; base: string; light: string; glint: string };
  metal: Metal;
  gem: string;
  glow: string;
  frame: "pillars" | "serpent" | "wings" | "branches";
};

const GOLD: Metal = { deep: "#3e2a0c", base: "#a77d2c", light: "#e9c96f", spec: "#fff3c4" };
const SILVER: Metal = { deep: "#262c30", base: "#7d878d", light: "#d5dde1", spec: "#ffffff" };
const BRASS: Metal = { deep: "#3b2b10", base: "#9c7c3c", light: "#dcc07a", spec: "#fff1c8" };
const BRONZE: Metal = { deep: "#24160a", base: "#6e4a26", light: "#b88a54", spec: "#f3d3a0" };

const STYLES: Record<House, Style> = {
  [CharacterFaculty.GRYFFINDOR]: {
    sand: { deep: "#4d0710", base: "#b3172a", light: "#ff5a62", glint: "#ffd0d0" },
    metal: GOLD,
    gem: "#c41f33",
    glow: "255, 80, 70",
    frame: "pillars",
  },
  [CharacterFaculty.SLYTHERIN]: {
    sand: { deep: "#04331c", base: "#14874b", light: "#4fe596", glint: "#d4ffe6" },
    metal: SILVER,
    gem: "#1c9e58",
    glow: "70, 255, 150",
    frame: "serpent",
  },
  [CharacterFaculty.RAVENCLAW]: {
    sand: { deep: "#0a1a47", base: "#2453c2", light: "#6f9dff", glint: "#e2ecff" },
    metal: BRASS,
    gem: "#2f6ad8",
    glow: "90, 150, 255",
    frame: "wings",
  },
  [CharacterFaculty.HUFFLEPUFF]: {
    sand: { deep: "#6a3a03", base: "#e09412", light: "#ffd25a", glint: "#fff6d6" },
    metal: BRONZE,
    gem: "#f0a01a",
    glow: "255, 190, 70",
    frame: "branches",
  },
};

const random = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

export type HourglassEntry = { faculty: House; points: number };

type Geometry = {
  cx: number;
  glassTop: number;
  glassBottom: number;
  mid: number;
  half: number;
  radius: number;
  neck: number;
};

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
    this.title(ctx, updatedAt);

    const order = HOUSES.map((faculty) => entries.find((entry) => entry.faculty === faculty) ?? { faculty, points: 0 });
    const step = W / order.length;

    for (const [index, entry] of order.entries()) {
      const geometry: Geometry = {
        cx: step * index + step / 2,
        glassTop: 360,
        glassBottom: 850,
        mid: 605,
        half: 245,
        radius: 96,
        neck: 8,
      };

      await this.hourglass(ctx, geometry, entry, Math.max(0, Math.min(1, entry.points / max)), entry.points === leader && leader > 0, rnd);
    }

    return canvas.encode("jpeg", 92);
  }

  private static title(ctx: SKRSContext2D, updatedAt: Date) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = `66px ${CAPS}`;
    const gradient = ctx.createLinearGradient(0, 40, 0, 104);
    gradient.addColorStop(0, GOLD.spec);
    gradient.addColorStop(0.5, GOLD.light);
    gradient.addColorStop(1, GOLD.base);
    ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = gradient;
    ctx.fillText("ОЧКИ ФАКУЛЬТЕТОВ", W / 2, 100);
    ctx.shadowColor = "transparent";

    ctx.strokeStyle = "rgba(233, 201, 111, 0.55)";
    ctx.lineWidth = 1.5;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(W / 2 + side * 330, 78);
      ctx.bezierCurveTo(W / 2 + side * 420, 60, W / 2 + side * 470, 98, W / 2 + side * 560, 78);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(W / 2 + side * 566, 78, 5, 0, TAU);
      ctx.stroke();
    }

    ctx.font = `26px ${HAND}`;
    ctx.fillStyle = "rgba(232, 220, 192, 0.6)";
    ctx.fillText(`обновлено ${MoscowTime.format(updatedAt)} МСК`, W / 2, 142);
    ctx.restore();
  }

  private static backdrop(ctx: SKRSContext2D, rnd: () => number) {
    const base = ctx.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, "#111a17");
    base.addColorStop(0.78, "#0b1210");
    base.addColorStop(1, "#060a09");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.035)";
    ctx.lineWidth = 2;
    for (let y = 40; y < 1010; y += 84) {
      const offset = Math.round(y / 84) % 2 ? 0 : 120;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
      for (let x = offset; x < W; x += 240) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, Math.min(y + 84, 1010));
        ctx.stroke();
      }
    }

    for (let i = 0; i < 12000; i++) {
      ctx.fillStyle = `rgba(${rnd() > 0.5 ? "255, 255, 255" : "0, 0, 0"}, ${rnd() * 0.04})`;
      ctx.fillRect(rnd() * W, rnd() * H, 1 + rnd() * 2, 1 + rnd() * 2);
    }

    for (const [x, y, r] of [[120, 180, 520], [W - 120, 180, 520], [W / 2, 0, 700]] as const) {
      const light = ctx.createRadialGradient(x, y, 10, x, y, r);
      light.addColorStop(0, "rgba(255, 186, 90, 0.16)");
      light.addColorStop(1, "rgba(255, 186, 90, 0)");
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, W, H);
    }

    const floor = ctx.createLinearGradient(0, 1010, 0, H);
    floor.addColorStop(0, "#1a1712");
    floor.addColorStop(1, "#08070a");
    ctx.fillStyle = floor;
    ctx.fillRect(0, 1010, W, H - 1010);
    ctx.fillStyle = "rgba(233, 201, 111, 0.18)";
    ctx.fillRect(0, 1010, W, 2);

    const vignette = ctx.createRadialGradient(W / 2, H / 2, 380, W / 2, H / 2, W * 0.72);
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.75)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
  }

  private static shade(ctx: SKRSContext2D, metal: Metal, x0: number, x1: number) {
    const gradient = ctx.createLinearGradient(x0, 0, x1, 0);
    gradient.addColorStop(0, metal.deep);
    gradient.addColorStop(0.16, metal.base);
    gradient.addColorStop(0.3, metal.light);
    gradient.addColorStop(0.36, metal.spec);
    gradient.addColorStop(0.44, metal.light);
    gradient.addColorStop(0.68, metal.base);
    gradient.addColorStop(0.9, metal.deep);
    gradient.addColorStop(1, metal.base);
    return gradient;
  }

  private static cylinder(ctx: SKRSContext2D, metal: Metal, cx: number, y: number, width: number, height: number) {
    const rx = width / 2;
    const ry = Math.max(4, width * 0.07);

    ctx.fillStyle = this.shade(ctx, metal, cx - rx, cx + rx);
    ctx.beginPath();
    ctx.moveTo(cx - rx, y);
    ctx.lineTo(cx - rx, y + height);
    ctx.ellipse(cx, y + height, rx, ry, 0, Math.PI, 0, true);
    ctx.lineTo(cx + rx, y);
    ctx.closePath();
    ctx.fill();

    const top = ctx.createLinearGradient(0, y - ry, 0, y + ry);
    top.addColorStop(0, metal.light);
    top.addColorStop(1, metal.base);
    ctx.fillStyle = top;
    ctx.beginPath();
    ctx.ellipse(cx, y, rx, ry, 0, 0, TAU);
    ctx.fill();

    ctx.strokeStyle = "rgba(0, 0, 0, 0.45)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(cx, y + height, rx, ry, 0, 0, Math.PI);
    ctx.stroke();
    ctx.strokeStyle = this.rgba(metal.spec, 0.5);
    ctx.beginPath();
    ctx.ellipse(cx, y, rx - 1, ry - 1, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
  }

  private static ring(ctx: SKRSContext2D, metal: Metal, cx: number, y: number, width: number, thickness: number) {
    ctx.save();
    ctx.strokeStyle = this.shade(ctx, metal, cx - width / 2, cx + width / 2);
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.ellipse(cx, y, width / 2, Math.max(3, width * 0.07), 0, 0, Math.PI);
    ctx.stroke();
    ctx.strokeStyle = this.rgba(metal.spec, 0.45);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(cx, y - thickness * 0.3, width / 2, Math.max(3, width * 0.07), 0, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.restore();
  }

  private static gem(ctx: SKRSContext2D, x: number, y: number, r: number, color: string) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = r * 1.6;
    const body = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    body.addColorStop(0, "#ffffff");
    body.addColorStop(0.25, color);
    body.addColorStop(1, "#000000");
    ctx.fillStyle = body;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * TAU + Math.PI / 8;
      ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r * 1.12);
    }
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * TAU + Math.PI / 8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * r, y + Math.sin(angle) * r * 1.12);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.4, Math.max(1.2, r * 0.18), 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private static tube(ctx: SKRSContext2D, metal: Metal, width: number, draw: () => void) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const [color, ratio, dx] of [
      [metal.deep, 1, 0],
      [metal.base, 0.72, -width * 0.06],
      [metal.light, 0.36, -width * 0.16],
      [metal.spec, 0.12, -width * 0.2],
    ] as const) {
      ctx.save();
      ctx.translate(dx, 0);
      ctx.strokeStyle = color;
      ctx.lineWidth = width * ratio;
      ctx.beginPath();
      draw();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  private static scroll(ctx: SKRSContext2D, metal: Metal, x: number, y: number, size: number, flip: number, rotate = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotate);
    ctx.scale(flip, 1);
    this.tube(ctx, metal, size * 0.16, () => {
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(size * 0.4, -size * 0.1, size * 0.9, -size * 0.2, size * 0.9, -size * 0.6);
      ctx.bezierCurveTo(size * 0.9, -size * 0.95, size * 0.45, -size * 0.95, size * 0.45, -size * 0.65);
      ctx.bezierCurveTo(size * 0.45, -size * 0.45, size * 0.7, -size * 0.45, size * 0.7, -size * 0.62);
    });
    ctx.restore();
  }

  private static glint(ctx: SKRSContext2D, x: number, y: number, size: number, color: string) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.quadraticCurveTo(x, y, x + size, y);
    ctx.quadraticCurveTo(x, y, x, y + size);
    ctx.quadraticCurveTo(x, y, x - size, y);
    ctx.quadraticCurveTo(x, y, x, y - size);
    ctx.fill();
    ctx.restore();
  }

  private static rgba(hex: string, alpha: number) {
    const value = Number.parseInt(hex.slice(1), 16);

    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
  }

  private static profile(u: number) {
    return Math.pow(Math.max(0, 1 - Math.pow(u, 2.3)), 0.85);
  }

  private static width(g: Geometry, y: number) {
    if (y <= g.mid) {
      return g.neck + (g.radius - g.neck) * this.profile((y - g.glassTop) / (g.mid - g.glassTop));
    }

    return g.neck + (g.radius - g.neck) * this.profile((g.glassBottom - y) / (g.glassBottom - g.mid));
  }

  private static bulbPath(ctx: SKRSContext2D, g: Geometry, inset = 0) {
    const steps = 60;

    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const y = g.glassTop + ((g.glassBottom - g.glassTop) * i) / steps;
      ctx.lineTo(g.cx - Math.max(1, this.width(g, y) - inset), y);
    }
    for (let i = steps; i >= 0; i--) {
      const y = g.glassTop + ((g.glassBottom - g.glassTop) * i) / steps;
      ctx.lineTo(g.cx + Math.max(1, this.width(g, y) - inset), y);
    }
    ctx.closePath();
  }

  private static sand(ctx: SKRSContext2D, style: Style, g: Geometry, top: number, bottom: number, rnd: () => number, shape: () => void) {
    ctx.save();
    shape();
    ctx.clip();

    const across = ctx.createLinearGradient(g.cx - g.radius, 0, g.cx + g.radius, 0);
    across.addColorStop(0, style.sand.deep);
    across.addColorStop(0.35, style.sand.base);
    across.addColorStop(0.5, style.sand.light);
    across.addColorStop(0.7, style.sand.base);
    across.addColorStop(1, style.sand.deep);
    ctx.fillStyle = across;
    ctx.fillRect(g.cx - g.radius, top, g.radius * 2, bottom - top);

    const depth = ctx.createLinearGradient(0, top, 0, bottom);
    depth.addColorStop(0, "rgba(255, 255, 255, 0.12)");
    depth.addColorStop(0.25, "rgba(0, 0, 0, 0)");
    depth.addColorStop(1, "rgba(0, 0, 0, 0.35)");
    ctx.fillStyle = depth;
    ctx.fillRect(g.cx - g.radius, top, g.radius * 2, bottom - top);

    const count = Math.round((g.radius * 2 * (bottom - top)) / 10);
    for (let i = 0; i < count; i++) {
      const roll = rnd();
      ctx.fillStyle = roll > 0.85 ? style.sand.light : roll > 0.45 ? style.sand.base : style.sand.deep;
      ctx.globalAlpha = 0.55 + rnd() * 0.4;
      ctx.beginPath();
      ctx.arc(g.cx - g.radius + rnd() * g.radius * 2, top + rnd() * (bottom - top), 0.8 + rnd() * 1.9, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (let i = 0; i < Math.round((bottom - top) / 9); i++) {
      this.glint(ctx, g.cx - g.radius * 0.8 + rnd() * g.radius * 1.6, top + 6 + rnd() * (bottom - top - 6), 2 + rnd() * 4, style.sand.glint);
    }

    ctx.restore();
  }

  private static async hourglass(ctx: SKRSContext2D, g: Geometry, entry: HourglassEntry, fill: number, leader: boolean, rnd: () => number) {
    const style = STYLES[entry.faculty];
    const { cx } = g;

    const shadow = ctx.createRadialGradient(cx, 1012, 10, cx, 1012, 220);
    shadow.addColorStop(0, "rgba(0, 0, 0, 0.75)");
    shadow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(cx, 1012, 220, 34, 0, 0, TAU);
    ctx.fill();

    if (leader) {
      const halo = ctx.createRadialGradient(cx, g.mid, 40, cx, g.mid, 360);
      halo.addColorStop(0, `rgba(${style.glow}, 0.26)`);
      halo.addColorStop(1, `rgba(${style.glow}, 0)`);
      ctx.fillStyle = halo;
      ctx.fillRect(cx - 380, g.mid - 380, 760, 760);
    }

    this.frame(ctx, style, g, "back", rnd);
    this.glass(ctx, style, g, fill, rnd);
    this.frame(ctx, style, g, "front", rnd);
    this.base(ctx, style, g);
    await this.crown(ctx, style, g, entry.faculty);
    this.plaque(ctx, style, g, entry, leader);
  }

  private static glass(ctx: SKRSContext2D, style: Style, g: Geometry, fill: number, rnd: () => number) {
    const { cx } = g;

    ctx.save();
    this.bulbPath(ctx, g);
    const tint = ctx.createLinearGradient(cx - g.radius, 0, cx + g.radius, 0);
    tint.addColorStop(0, "rgba(190, 220, 230, 0.16)");
    tint.addColorStop(0.2, "rgba(190, 220, 230, 0.04)");
    tint.addColorStop(0.8, "rgba(190, 220, 230, 0.03)");
    tint.addColorStop(1, "rgba(190, 220, 230, 0.14)");
    ctx.fillStyle = tint;
    ctx.fill();
    ctx.clip();

    const lowerLevel = g.glassBottom - fill * g.half * 0.95;

    if (fill > 0) {
      this.sand(ctx, style, g, lowerLevel - 34, g.glassBottom + 2, rnd, () => {
        ctx.beginPath();
        ctx.moveTo(cx - g.radius, g.glassBottom + 2);
        ctx.lineTo(cx - g.radius, lowerLevel + 12);
        ctx.bezierCurveTo(cx - g.radius * 0.45, lowerLevel + 4, cx - 14, lowerLevel - 30, cx, lowerLevel - 32);
        ctx.bezierCurveTo(cx + 14, lowerLevel - 30, cx + g.radius * 0.45, lowerLevel + 4, cx + g.radius, lowerLevel + 12);
        ctx.lineTo(cx + g.radius, g.glassBottom + 2);
        ctx.closePath();
      });

      ctx.strokeStyle = this.rgba(style.sand.glint, 0.35);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - g.radius * 0.7, lowerLevel + 8);
      ctx.bezierCurveTo(cx - g.radius * 0.3, lowerLevel, cx - 12, lowerLevel - 28, cx, lowerLevel - 30);
      ctx.stroke();
    }

    const upperFill = fill >= 1 ? 0 : Math.max(0.07, 0.86 * (1 - fill));
    const upperLevel = g.mid - upperFill * g.half;

    if (upperFill > 0) {
      this.sand(ctx, style, g, upperLevel - 6, g.mid + 6, rnd, () => {
        ctx.beginPath();
        ctx.moveTo(cx - g.radius, upperLevel - 4);
        ctx.bezierCurveTo(cx - g.radius * 0.4, upperLevel - 2, cx - 16, upperLevel + 22, cx, upperLevel + 26);
        ctx.bezierCurveTo(cx + 16, upperLevel + 22, cx + g.radius * 0.4, upperLevel - 2, cx + g.radius, upperLevel - 4);
        ctx.lineTo(cx + g.radius, g.mid + 6);
        ctx.lineTo(cx - g.radius, g.mid + 6);
        ctx.closePath();
      });
    }

    if (upperFill > 0 && fill < 1) {
      const end = fill > 0 ? lowerLevel - 30 : g.glassBottom;
      const stream = ctx.createLinearGradient(cx - 2, 0, cx + 2, 0);
      stream.addColorStop(0, style.sand.deep);
      stream.addColorStop(0.5, style.sand.light);
      stream.addColorStop(1, style.sand.deep);
      ctx.fillStyle = stream;
      ctx.fillRect(cx - 1.6, g.mid, 3.2, end - g.mid);
      for (let i = 0; i < 26; i++) {
        ctx.fillStyle = rnd() > 0.6 ? style.sand.glint : style.sand.light;
        ctx.beginPath();
        ctx.arc(cx + (rnd() - 0.5) * 7, g.mid + rnd() * (end - g.mid), 0.8 + rnd() * 1.3, 0, TAU);
        ctx.fill();
      }
    }

    const edge = ctx.createLinearGradient(cx - g.radius, 0, cx + g.radius, 0);
    edge.addColorStop(0, "rgba(0, 0, 0, 0.35)");
    edge.addColorStop(0.12, "rgba(0, 0, 0, 0)");
    edge.addColorStop(0.88, "rgba(0, 0, 0, 0)");
    edge.addColorStop(1, "rgba(0, 0, 0, 0.4)");
    ctx.fillStyle = edge;
    ctx.fillRect(cx - g.radius, g.glassTop, g.radius * 2, g.glassBottom - g.glassTop);

    ctx.restore();

    ctx.save();
    ctx.lineCap = "round";
    for (const [x0, y0, x1, y1, x2, y2, width, alpha] of [
      [-0.66, g.glassTop + 26, -0.86, g.glassTop + g.half * 0.5, -0.32, g.mid - 46, 9, 0.22],
      [-0.6, g.glassTop + 40, -0.74, g.glassTop + g.half * 0.45, -0.3, g.mid - 70, 3, 0.55],
      [-0.32, g.mid + 56, -0.86, g.mid + g.half * 0.55, -0.66, g.glassBottom - 26, 9, 0.2],
      [-0.3, g.mid + 76, -0.76, g.mid + g.half * 0.55, -0.6, g.glassBottom - 40, 3, 0.5],
      [0.62, g.glassTop + 50, 0.72, g.glassTop + g.half * 0.4, 0.5, g.mid - 90, 2.5, 0.3],
      [0.5, g.mid + 90, 0.74, g.mid + g.half * 0.6, 0.62, g.glassBottom - 50, 2.5, 0.28],
    ] as const) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(cx + g.radius * x0, y0);
      ctx.quadraticCurveTo(cx + g.radius * x1, y1, cx + g.radius * x2, y2);
      ctx.stroke();
    }

    this.bulbPath(ctx, g);
    ctx.strokeStyle = "rgba(210, 235, 245, 0.55)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    this.bulbPath(ctx, g, 5);
    ctx.strokeStyle = "rgba(210, 235, 245, 0.16)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    this.ring(ctx, style.metal, cx, g.mid - 2, g.neck * 2 + 18, 7);
  }

  private static frame(ctx: SKRSContext2D, style: Style, g: Geometry, layer: "back" | "front", rnd: () => number) {
    const { cx, radius } = g;
    const top = g.glassTop - 18;
    const bottom = g.glassBottom + 18;
    const metal = style.metal;

    const column = (x: number, width: number, dim: number) => {
      ctx.save();
      ctx.globalAlpha = dim;
      ctx.fillStyle = this.shade(ctx, metal, x - width / 2, x + width / 2);
      ctx.fillRect(x - width / 2, top, width, bottom - top);
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 1;
      for (const dx of [-width * 0.22, width * 0.22]) {
        ctx.beginPath();
        ctx.moveTo(x + dx, top + 24);
        ctx.lineTo(x + dx, bottom - 24);
        ctx.stroke();
      }
      for (const y of [top + 14, top + (bottom - top) * 0.5, bottom - 14]) {
        this.ring(ctx, metal, x, y, width * 1.9, 6);
      }
      ctx.restore();
    };

    switch (style.frame) {
      case "pillars":
        if (layer === "back") {
          column(cx - radius - 6, 12, 0.55);
          column(cx + radius + 6, 12, 0.55);
        } else {
          column(cx - radius - 34, 22, 1);
          column(cx + radius + 34, 22, 1);
          this.scroll(ctx, metal, cx - radius - 24, top + 70, 34, 1, 0.2);
          this.scroll(ctx, metal, cx + radius + 24, top + 70, 34, -1, -0.2);
          this.scroll(ctx, metal, cx - radius - 24, bottom - 40, 34, 1, Math.PI - 0.2);
          this.scroll(ctx, metal, cx + radius + 24, bottom - 40, 34, -1, -Math.PI + 0.2);
        }
        break;

      case "serpent": {
        if (layer === "back") {
          column(cx - radius - 30, 10, 0.75);
          column(cx + radius + 30, 10, 0.75);
        }
        for (const phase of [0, Math.PI]) {
          const points: [number, number, number][] = [];
          for (let y = top + 20; y <= bottom - 12; y += 4) {
            const t = (y - top) / (bottom - top);
            const angle = t * Math.PI * 3.2 + phase;
            points.push([cx + Math.sin(angle) * (radius + 22), y, Math.cos(angle)]);
          }
          let segment: [number, number][] = [];
          const flush = () => {
            if (segment.length > 1) {
              const copy = segment;
              this.tube(ctx, metal, 14, () => {
                ctx.moveTo(copy[0][0], copy[0][1]);
                for (const [x, y] of copy) ctx.lineTo(x, y);
              });
            }
            segment = [];
          };
          for (const [x, y, depth] of points) {
            const front = depth > 0;
            if (front === (layer === "front")) segment.push([x, y]);
            else flush();
          }
          flush();
        }
        if (layer === "front") {
          for (const side of [-1, 1]) {
            const hx = cx + side * (radius + 20);
            const hy = bottom - 20;
            ctx.fillStyle = this.shade(ctx, metal, hx - 14, hx + 14);
            ctx.beginPath();
            ctx.ellipse(hx, hy, 15, 10, side * 0.3, 0, TAU);
            ctx.fill();
            this.gem(ctx, hx - side * 4, hy - 2, 3.2, style.gem);
          }
        }
        break;
      }

      case "wings":
        if (layer === "back") {
          column(cx - radius - 8, 10, 0.55);
          column(cx + radius + 8, 10, 0.55);
        } else {
          column(cx - radius - 30, 14, 1);
          column(cx + radius + 30, 14, 1);
          for (let i = 0; i < 14; i++) {
            this.glint(ctx, cx + (rnd() - 0.5) * radius * 3.2, top + rnd() * (bottom - top), 2 + rnd() * 3, "rgba(200, 220, 255, 0.85)");
          }
        }
        break;

      case "branches":
        for (const side of [-1, 1]) {
          const draw = () => {
            ctx.moveTo(cx + side * (radius + 26), bottom + 6);
            ctx.bezierCurveTo(cx + side * (radius + 74), bottom - 170, cx + side * (radius - 6), top + 270, cx + side * (radius + 40), top + 130);
            ctx.bezierCurveTo(cx + side * (radius + 66), top + 56, cx + side * (radius + 8), top + 22, cx + side * (radius + 24), top - 6);
          };

          if (layer === "back") {
            ctx.save();
            ctx.globalAlpha = 0.6;
            ctx.translate(side * -16, 0);
            this.tube(ctx, metal, 12, draw);
            ctx.restore();
            continue;
          }

          this.tube(ctx, metal, 18, draw);

          for (const [t, angle, size] of [[0.18, 0.7, 20], [0.36, -0.5, 16], [0.55, 0.9, 22], [0.74, -0.4, 17], [0.88, 0.6, 14]] as const) {
            const y = top + (bottom - top) * t;
            const x = cx + side * (radius + 40 + Math.sin(t * 9) * 12);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(side * angle);
            const leaf = ctx.createLinearGradient(-size, 0, size, 0);
            leaf.addColorStop(0, "#2f4a17");
            leaf.addColorStop(0.5, "#7fa23e");
            leaf.addColorStop(1, "#3c5a1c");
            ctx.fillStyle = leaf;
            ctx.beginPath();
            ctx.moveTo(-size, 0);
            ctx.quadraticCurveTo(0, -size * 0.55, size, 0);
            ctx.quadraticCurveTo(0, size * 0.55, -size, 0);
            ctx.fill();
            ctx.strokeStyle = "rgba(20, 35, 10, 0.6)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-size * 0.9, 0);
            ctx.lineTo(size * 0.9, 0);
            ctx.stroke();
            ctx.restore();
          }
        }
        break;
    }
  }

  private static base(ctx: SKRSContext2D, style: Style, g: Geometry) {
    const { cx, radius } = g;
    const metal = style.metal;
    const topPlate = g.glassTop - 40;
    const bottomPlate = g.glassBottom + 2;

    this.cylinder(ctx, metal, cx, topPlate + 22, radius * 2 + 64, 18);
    this.ring(ctx, metal, cx, topPlate + 22, radius * 2 + 50, 5);
    this.cylinder(ctx, metal, cx, topPlate - 4, radius * 2 + 30, 24);
    this.gem(ctx, cx, topPlate + 9, 9, style.gem);
    for (const dx of [-radius * 0.62, radius * 0.62]) {
      this.gem(ctx, cx + dx, topPlate + 9, 4.5, style.gem);
    }

    this.cylinder(ctx, metal, cx, bottomPlate, radius * 2 + 64, 18);
    this.ring(ctx, metal, cx, bottomPlate + 20, radius * 2 + 50, 5);
    this.cylinder(ctx, metal, cx, bottomPlate + 22, radius * 2 + 30, 26);
    this.gem(ctx, cx, bottomPlate + 36, 8, style.gem);

    const plinthTop = bottomPlate + 52;
    const plinthBottom = plinthTop + 58;
    const front = ctx.createLinearGradient(cx - radius - 60, 0, cx + radius + 60, 0);
    front.addColorStop(0, metal.deep);
    front.addColorStop(0.25, metal.base);
    front.addColorStop(0.38, metal.light);
    front.addColorStop(0.45, metal.spec);
    front.addColorStop(0.55, metal.light);
    front.addColorStop(0.85, metal.base);
    front.addColorStop(1, metal.deep);
    ctx.fillStyle = front;
    ctx.beginPath();
    ctx.moveTo(cx - radius - 30, plinthTop);
    ctx.bezierCurveTo(cx - radius - 34, plinthTop + 26, cx - radius - 64, plinthTop + 30, cx - radius - 66, plinthBottom);
    ctx.lineTo(cx + radius + 66, plinthBottom);
    ctx.bezierCurveTo(cx + radius + 64, plinthTop + 30, cx + radius + 34, plinthTop + 26, cx + radius + 30, plinthTop);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    this.cylinder(ctx, metal, cx, plinthBottom, radius * 2 + 150, 16);

    this.scroll(ctx, metal, cx - 30, plinthTop + 40, 30, -1, 0);
    this.scroll(ctx, metal, cx + 30, plinthTop + 40, 30, 1, 0);

    for (const dx of [-radius - 62, radius + 62]) {
      const foot = ctx.createRadialGradient(cx + dx - 6, plinthBottom + 30, 2, cx + dx, plinthBottom + 34, 20);
      foot.addColorStop(0, metal.spec);
      foot.addColorStop(0.4, metal.light);
      foot.addColorStop(1, metal.deep);
      ctx.fillStyle = foot;
      ctx.beginPath();
      ctx.ellipse(cx + dx, plinthBottom + 34, 20, 16, 0, 0, TAU);
      ctx.fill();
    }
  }

  private static async crown(ctx: SKRSContext2D, style: Style, g: Geometry, faculty: House) {
    const { cx, radius } = g;
    const metal = style.metal;
    const baseY = g.glassTop - 44;

    this.cylinder(ctx, metal, cx, baseY - 18, radius * 1.3, 16);

    switch (style.frame) {
      case "pillars": {
        const roof = ctx.createLinearGradient(cx - radius - 50, 0, cx + radius + 50, 0);
        roof.addColorStop(0, metal.deep);
        roof.addColorStop(0.35, metal.light);
        roof.addColorStop(0.45, metal.spec);
        roof.addColorStop(0.6, metal.base);
        roof.addColorStop(1, metal.deep);
        ctx.fillStyle = roof;
        ctx.beginPath();
        ctx.moveTo(cx - radius - 48, baseY - 14);
        ctx.lineTo(cx, baseY - 104);
        ctx.lineTo(cx + radius + 48, baseY - 14);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
        ctx.beginPath();
        ctx.moveTo(cx - radius - 16, baseY - 22);
        ctx.lineTo(cx, baseY - 82);
        ctx.lineTo(cx + radius + 16, baseY - 22);
        ctx.closePath();
        ctx.fill();
        this.cylinder(ctx, metal, cx, baseY - 20, radius * 2 + 110, 10);
        break;
      }

      case "serpent":
        for (let i = -3; i <= 3; i++) {
          const x = cx + i * 22;
          const height = 46 - Math.abs(i) * 8;
          ctx.fillStyle = this.shade(ctx, metal, x - 7, x + 7);
          ctx.beginPath();
          ctx.moveTo(x - 7, baseY - 16);
          ctx.quadraticCurveTo(x, baseY - 16 - height * 1.2, x + 7, baseY - 16);
          ctx.closePath();
          ctx.fill();
          if (i % 2 === 0) this.gem(ctx, x, baseY - 16 - height * 0.8, 3.5, style.gem);
        }
        this.scroll(ctx, metal, cx - radius * 0.9, baseY - 10, 40, -1, 0);
        this.scroll(ctx, metal, cx + radius * 0.9, baseY - 10, 40, 1, 0);
        break;

      case "wings":
        for (const side of [-1, 1]) {
          for (let i = 0; i < 6; i++) {
            const length = 120 - i * 12;
            const angle = -0.2 - i * 0.16;
            ctx.save();
            ctx.translate(cx + side * 30, baseY - 46);
            ctx.scale(side, 1);
            ctx.rotate(angle);
            ctx.fillStyle = this.shade(ctx, metal, 0, length);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(length * 0.5, -14, length, 0);
            ctx.quadraticCurveTo(length * 0.5, 8, 0, 6);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
          }
        }
        break;

      case "branches":
        for (const side of [-1, 1]) {
          this.tube(ctx, metal, 12, () => {
            ctx.moveTo(cx + side * radius * 0.6, baseY - 14);
            ctx.bezierCurveTo(cx + side * radius * 1.1, baseY - 60, cx + side * 30, baseY - 110, cx + side * 6, baseY - 70);
          });
        }
        break;
    }

    const crest = await Parchment.crest(faculty);
    const size = 128;
    const crestY = baseY - (style.frame === "pillars" ? 196 : 168);

    this.cylinder(ctx, metal, cx, crestY + size - 6, 54, 12);

    if (crest) {
      ctx.save();
      ctx.shadowColor = `rgba(${style.glow}, 0.85)`;
      ctx.shadowBlur = 26;
      ctx.drawImage(crest, cx - size / 2, crestY, size, size);
      ctx.restore();
    }
  }

  private static plaque(ctx: SKRSContext2D, style: Style, g: Geometry, entry: HourglassEntry, leader: boolean) {
    const { cx } = g;
    const y = 1048;
    const width = 250;
    const height = 112;

    ctx.save();
    const frame = ctx.createLinearGradient(cx - width / 2, 0, cx + width / 2, 0);
    frame.addColorStop(0, style.metal.deep);
    frame.addColorStop(0.35, style.metal.light);
    frame.addColorStop(0.5, style.metal.spec);
    frame.addColorStop(0.7, style.metal.base);
    frame.addColorStop(1, style.metal.deep);
    ctx.fillStyle = frame;
    ctx.beginPath();
    ctx.roundRect(cx - width / 2, y, width, height, 14);
    ctx.fill();
    ctx.fillStyle = "#0e1412";
    ctx.beginPath();
    ctx.roundRect(cx - width / 2 + 6, y + 6, width - 12, height - 12, 10);
    ctx.fill();

    ctx.textAlign = "center";
    ctx.font = `54px ${CAPS}`;
    const digits = ctx.createLinearGradient(0, y + 14, 0, y + 70);
    digits.addColorStop(0, style.metal.spec);
    digits.addColorStop(0.6, style.metal.light);
    digits.addColorStop(1, style.metal.base);
    ctx.fillStyle = digits;
    ctx.shadowColor = `rgba(${style.glow}, ${leader ? 0.9 : 0.5})`;
    ctx.shadowBlur = leader ? 18 : 8;
    ctx.fillText(String(entry.points), cx, y + 58);
    ctx.shadowColor = "transparent";
    ctx.font = `30px ${SCRIPT}`;
    ctx.fillStyle = style.sand.light;
    ctx.fillText(HOUSE_LABELS[entry.faculty], cx, y + 92);
    ctx.restore();
  }
}
