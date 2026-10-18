import { AwardRarity } from "../../../database/generated/prisma/enums.js";

const rarityLabels: Record<AwardRarity, string> = {
  [AwardRarity.COMMON]: "Обычная",
  [AwardRarity.RARE]: "Редкая",
  [AwardRarity.EPIC]: "Эпическая",
  [AwardRarity.LEGENDARY]: "Легендарная",
};

const rarityEmojis: Record<AwardRarity, string> = {
  [AwardRarity.COMMON]: "<:37647tarotcardids:1519585008262578326>",
  [AwardRarity.RARE]: "<:36558tarotcardids:1519585006991839242>",
  [AwardRarity.EPIC]: "<:47365tarotcardids:1519585016122834985>",
  [AwardRarity.LEGENDARY]: "<:22796tarotcardids:1519585002827026588>",
};

export const RARITY_ORDER: AwardRarity[] = [
  AwardRarity.COMMON,
  AwardRarity.RARE,
  AwardRarity.EPIC,
  AwardRarity.LEGENDARY,
];

export class AwardFormatter {
  public static rarity(rarity: AwardRarity) {
    return `${rarityEmojis[rarity] ?? ""} ${rarityLabels[rarity] ?? rarity}`.trim();
  }

  public static stars(rarity: AwardRarity) {
    const filled = RARITY_ORDER.indexOf(rarity) + 1;

    if (filled <= 0) {
      return "";
    }

    return "★".repeat(filled) + "☆".repeat(RARITY_ORDER.length - filled);
  }

  public static rarityLabel(rarity: AwardRarity) {
    return rarityLabels[rarity] ?? rarity;
  }

  public static rarityEmoji(rarity: AwardRarity) {
    return rarityEmojis[rarity];
  }

  public static parseEmoji(emojiStr: string) {
    if (!emojiStr) return undefined;

    const value = emojiStr.trim();

    const custom = value.match(/^<(a)?:([a-zA-Z0-9_]+):(\d+)>$/);

    if (custom) {
      return {
        id: custom[3],
        name: custom[2],
        animated: Boolean(custom[1]),
      };
    }

    if (
      /\p{Extended_Pictographic}/u.test(value) ||
      /\p{Emoji_Presentation}/u.test(value)
    ) {
      return {
        name: value,
      };
    }

    return undefined;
  }
}
