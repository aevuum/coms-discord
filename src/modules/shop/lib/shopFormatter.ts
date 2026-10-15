import type { StringSelectMenuOptionBuilder } from "discord.js";

import type { ShopItem } from "../../../database/generated/prisma/client.js";

import { CoinFormatter } from "../../coins/lib/coinFormatter.js";

const DEFAULT_EMOJI = "📦";

export class ShopFormatter {
  public static title(item: Pick<ShopItem, "name" | "emoji">) {
    return `${item.emoji ?? DEFAULT_EMOJI} ${item.name}`;
  }

  public static listEntry(item: ShopItem) {
    return [
      `${this.title(item)} · ${CoinFormatter.amount(item.price)}`,
      item.description ? `-# ${item.description}` : null,
    ]
      .filter((line) => line !== null)
      .join("\n");
  }

  public static applyEmoji(
    option: StringSelectMenuOptionBuilder,
    emoji: string | null,
  ) {
    if (emoji && !/^<a?:/.test(emoji)) {
      option.setEmoji(emoji);
    }

    return option;
  }
}
