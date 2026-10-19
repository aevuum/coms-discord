import { fileURLToPath } from "node:url";

import {
  createCanvas,
  GlobalFonts,
  loadImage,
  type Image,
  type SKRSContext2D,
} from "@napi-rs/canvas";
import type { Client } from "discord.js";

import type { ActivityRow } from "../repositories/activityRepository.js";

export const TOP_BANNER_NAME = "top.jpg";

const BANNER_PATH = fileURLToPath(new URL("../../../../assets/activity/banner.webp", import.meta.url));
const FONT_PATH = fileURLToPath(new URL("../../../../assets/activity/NotoSans-Bold.ttf", import.meta.url));
const FONT_FAMILY = "ComsSans";

const CACHE_TTL_MS = 5 * 60 * 1000;

const IVORY = "#e9efe6";
const MINT = "#9fe8c4";
const GLOW = "rgba(120, 255, 190, 0.85)";
const FOG = "rgba(4, 18, 12, 0.6)";

type Slot = {
  x: number;
  y: number;
  radius: number;
  nameSize: number;
  nameWidth: number;
};

const SLOTS: Slot[] = [
  { x: 300, y: 290, radius: 125, nameSize: 44, nameWidth: 480 },
  { x: 1600, y: 305, radius: 96, nameSize: 34, nameWidth: 240 },
  { x: 1860, y: 305, radius: 96, nameSize: 34, nameWidth: 240 },
];

export type BannerLeader = {
  name: string;
  avatar: Image | null;
  score: number;
};

export class TopBanner {
  private static banner: Image | null = null;

  private static fontReady = false;

  private static cache: { key: string; createdAt: number; buffer: Buffer } | null = null;

  public static async render(client: Client, rows: ActivityRow[]) {
    const key = rows.map((row) => `${row.discordId}:${row.score}`).join("|");

    if (this.cache && this.cache.key === key && Date.now() - this.cache.createdAt < CACHE_TTL_MS) {
      return this.cache.buffer;
    }

    const leaders = await Promise.all(rows.slice(0, 3).map((row) => this.loadLeader(client, row)));

    const buffer = await this.compose(leaders);

    this.cache = { key, createdAt: Date.now(), buffer };

    return buffer;
  }

  public static async compose(leaders: BannerLeader[]) {
    this.ensureFont();

    const banner = await this.getBanner();

    const canvas = createCanvas(banner.width, banner.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(banner, 0, 0);

    this.shadeSides(ctx, banner.width, banner.height);

    SLOTS.forEach((slot, index) => this.drawSlot(ctx, slot, index + 1, leaders[index] ?? null));

    return canvas.encode("jpeg", 92);
  }

  private static drawSlot(ctx: SKRSContext2D, slot: Slot, place: number, leader: BannerLeader | null) {
    this.drawHalo(ctx, slot);

    ctx.save();
    ctx.beginPath();
    ctx.arc(slot.x, slot.y, slot.radius, 0, Math.PI * 2);
    ctx.clip();

    if (leader?.avatar) {
      ctx.drawImage(leader.avatar, slot.x - slot.radius, slot.y - slot.radius, slot.radius * 2, slot.radius * 2);

      const tint = ctx.createRadialGradient(slot.x, slot.y, slot.radius * 0.55, slot.x, slot.y, slot.radius);
      tint.addColorStop(0, "rgba(10, 40, 28, 0)");
      tint.addColorStop(1, "rgba(10, 40, 28, 0.45)");
      ctx.fillStyle = tint;
      ctx.fillRect(slot.x - slot.radius, slot.y - slot.radius, slot.radius * 2, slot.radius * 2);
    } else {
      const empty = ctx.createRadialGradient(slot.x, slot.y, 0, slot.x, slot.y, slot.radius);
      empty.addColorStop(0, "rgba(40, 80, 62, 0.55)");
      empty.addColorStop(1, "rgba(6, 22, 15, 0.85)");
      ctx.fillStyle = empty;
      ctx.fillRect(slot.x - slot.radius, slot.y - slot.radius, slot.radius * 2, slot.radius * 2);
      this.drawSparkle(ctx, slot.x, slot.y, slot.radius * 0.35, 0.8);
    }

    ctx.restore();

    this.drawRing(ctx, slot);
    this.drawBadge(ctx, slot, place);
    this.drawSparkles(ctx, slot, place);

    const nameY = slot.y + slot.radius + slot.nameSize + 26;

    this.drawText(
      ctx,
      leader ? leader.name : "Свободно",
      slot.x,
      nameY,
      slot.nameSize,
      slot.nameWidth,
      leader ? IVORY : "rgba(233, 239, 230, 0.55)",
    );

    if (leader) {
      this.drawText(
        ctx,
        `${leader.score} очк.`,
        slot.x,
        nameY + slot.nameSize + 6,
        Math.round(slot.nameSize * 0.7),
        slot.nameWidth,
        MINT,
      );
    }
  }

  private static drawHalo(ctx: SKRSContext2D, slot: Slot) {
    const halo = ctx.createRadialGradient(slot.x, slot.y, slot.radius * 0.8, slot.x, slot.y, slot.radius * 1.9);
    halo.addColorStop(0, "rgba(90, 230, 160, 0.38)");
    halo.addColorStop(0.45, "rgba(60, 170, 120, 0.14)");
    halo.addColorStop(1, "rgba(30, 90, 60, 0)");

    ctx.save();
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(slot.x, slot.y, slot.radius * 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private static drawRing(ctx: SKRSContext2D, slot: Slot) {
    ctx.save();

    ctx.shadowColor = GLOW;
    ctx.shadowBlur = 28;
    ctx.strokeStyle = IVORY;
    ctx.lineWidth = slot.radius > 110 ? 5 : 4;
    ctx.beginPath();
    ctx.arc(slot.x, slot.y, slot.radius + 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(233, 239, 230, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([2, 9]);
    ctx.beginPath();
    ctx.arc(slot.x, slot.y, slot.radius + 16, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private static drawBadge(ctx: SKRSContext2D, slot: Slot, place: number) {
    const radius = Math.round(slot.radius * 0.27);
    const x = slot.x + slot.radius * 0.72;
    const y = slot.y + slot.radius * 0.72;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#0d2219";
    ctx.shadowColor = GLOW;
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = IVORY;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = IVORY;
    ctx.font = `${Math.round(radius * 1.15)}px ${FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = GLOW;
    ctx.shadowBlur = 8;
    ctx.fillText(String(place), x, y + 2);
    ctx.restore();
  }

  private static drawSparkles(ctx: SKRSContext2D, slot: Slot, place: number) {
    const sparkles = [
      { angle: -2.3, distance: 1.32, size: 0.13 },
      { angle: -0.55, distance: 1.25, size: 0.09 },
      { angle: 2.6, distance: 1.22, size: 0.07 },
    ];

    for (const sparkle of sparkles.slice(0, 4 - place)) {
      this.drawSparkle(
        ctx,
        slot.x + Math.cos(sparkle.angle) * slot.radius * sparkle.distance,
        slot.y + Math.sin(sparkle.angle) * slot.radius * sparkle.distance,
        slot.radius * sparkle.size,
        1,
      );
    }
  }

  private static drawSparkle(ctx: SKRSContext2D, x: number, y: number, size: number, alpha: number) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = GLOW;
    ctx.shadowBlur = size * 1.6;
    ctx.fillStyle = "#f4fff8";
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.quadraticCurveTo(x, y, x + size, y);
    ctx.quadraticCurveTo(x, y, x, y + size);
    ctx.quadraticCurveTo(x, y, x - size, y);
    ctx.quadraticCurveTo(x, y, x, y - size);
    ctx.fill();
    ctx.restore();
  }

  private static drawText(
    ctx: SKRSContext2D,
    text: string,
    x: number,
    y: number,
    size: number,
    maxWidth: number,
    color: string,
  ) {
    ctx.save();
    ctx.font = `${size}px ${FONT_FAMILY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";

    const fitted = this.fit(ctx, text, maxWidth);

    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
    ctx.shadowBlur = 14;
    ctx.fillText(fitted, x, y + 2);

    ctx.fillStyle = color;
    ctx.shadowColor = "rgba(90, 230, 160, 0.55)";
    ctx.shadowBlur = 18;
    ctx.fillText(fitted, x, y);
    ctx.restore();
  }

  private static fit(ctx: SKRSContext2D, text: string, maxWidth: number) {
    if (ctx.measureText(text).width <= maxWidth) {
      return text;
    }

    let result = [...text];

    while (result.length > 1 && ctx.measureText(`${result.join("")}…`).width > maxWidth) {
      result = result.slice(0, -1);
    }

    return `${result.join("").trimEnd()}…`;
  }

  private static shadeSides(ctx: SKRSContext2D, width: number, height: number) {
    const left = ctx.createLinearGradient(0, 0, 640, 0);
    left.addColorStop(0, FOG);
    left.addColorStop(1, "rgba(4, 18, 12, 0)");
    ctx.fillStyle = left;
    ctx.fillRect(0, 0, 640, height);

    const right = ctx.createLinearGradient(width, 0, width - 720, 0);
    right.addColorStop(0, FOG);
    right.addColorStop(1, "rgba(4, 18, 12, 0)");
    ctx.fillStyle = right;
    ctx.fillRect(width - 720, 0, 720, height);
  }

  private static async loadLeader(client: Client, row: ActivityRow): Promise<BannerLeader> {
    const guild = client.guilds.cache.get(process.env.GUILD_ID ?? "");

    const member = await guild?.members.fetch(row.discordId).catch(() => null);
    const user = member?.user ?? (await client.users.fetch(row.discordId).catch(() => null));

    const avatarUrl = (member ?? user)?.displayAvatarURL({ extension: "png", size: 256, forceStatic: true });

    return {
      name: member?.displayName ?? user?.displayName ?? row.discordId,
      avatar: avatarUrl ? await this.loadRemote(avatarUrl) : null,
      score: row.score,
    };
  }

  private static async loadRemote(url: string) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });

      if (!response.ok) {
        return null;
      }

      return await loadImage(Buffer.from(await response.arrayBuffer()));
    } catch {
      return null;
    }
  }

  private static async getBanner() {
    if (!this.banner) {
      this.banner = await loadImage(BANNER_PATH);
    }

    return this.banner;
  }

  private static ensureFont() {
    if (!this.fontReady) {
      GlobalFonts.registerFromPath(FONT_PATH, FONT_FAMILY);
      this.fontReady = true;
    }
  }
}
