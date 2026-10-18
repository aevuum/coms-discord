import type { Location } from "../../../database/generated/prisma/client.js";

import type { RouteWithTarget } from "../types/locations.js";

export const LOCATION_FALLBACK_EMOJI = "📍";

export class LocationFormatter {
  public static title(location: Pick<Location, "name" | "emoji">) {
    return `${location.emoji ?? LOCATION_FALLBACK_EMOJI} ${location.name}`;
  }

  public static duration(minutes: number) {
    if (minutes <= 0) {
      return "мгновенно";
    }

    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;

    return [hours ? `${hours} ч` : null, rest ? `${rest} мин` : null]
      .filter(Boolean)
      .join(" ");
  }

  public static needsApproval(route: Pick<RouteWithTarget, "magical" | "to">) {
    return route.magical && route.to.access === "APPROVAL";
  }

  public static item(route: Pick<RouteWithTarget, "itemName" | "itemQuantity">) {
    return route.itemName ? `${route.itemName} ×${route.itemQuantity}` : null;
  }

  public static conditions(route: RouteWithTarget) {
    return [
      this.duration(route.travelMinutes),
      this.item(route) ? `нужно: ${this.item(route)}` : null,
      route.adultOnly ? "только взрослые" : null,
      this.needsApproval(route) ? "по разрешению куратора" : null,
    ].filter((part): part is string => Boolean(part));
  }

  public static routeLine(route: RouteWithTarget) {
    return `**${this.title(route.to)}** · ${route.method}\n-# ${this.conditions(route).join(" · ")}`;
  }

  public static access(location: Pick<Location, "access">) {
    return location.access === "APPROVAL" ? "🔒 магией — по разрешению куратора" : "🔓 свободный вход";
  }

  public static selectEmoji(emoji: string | null) {
    if (!emoji) {
      return LOCATION_FALLBACK_EMOJI;
    }

    return emoji;
  }
}
