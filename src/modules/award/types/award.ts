import { AwardRarity } from "../../../database/generated/prisma/enums.js";

export interface IAward {
  id: string;
  label: string;
  emoji: string;
  description: string;
  rewardComsCoins: number;
  rarity: AwardRarity;
  createdAt: Date;
}

export type AwardPanelState =
  | "MAIN"
  | "DELETE_SELECT"
  | "GIVE_USER"
  | "TAKE_USER"
  | "TAKE_SELECT"
  | "CREATE_RARITY";

export interface IPanelSession {
  state: AwardPanelState;
  targetUserId?: string;
  pendingAwardData?: {
    label: string;
    emoji: string;
    description: string;
    rewardComsCoins: number;
  };
}
