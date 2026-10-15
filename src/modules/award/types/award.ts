import type { AwardRarity } from "../../../database/generated/prisma/enums.js";

export class AwardError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "AwardError";
  }
}

export interface IAward {
  id: string;
  label: string;
  emoji: string;
  description: string;
  rewardComsCoins: number;
  rarity: AwardRarity;
  createdAt: Date;
}

export type AwardInput = {
  label: string;
  emoji: string;
  coins: string;
  description: string;
  rarity: string;
};
