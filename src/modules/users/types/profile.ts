import {
  Character,
  InventoryItem,
  ShopItem,
  UserAward,
  Wallet,
} from "../../../database/generated/prisma/client.js";

export interface Award {
  id: string;
  label: string;
  emoji: string;
  description: string;
  rewardComsCoins: number;
  rarity: string;
  createdAt: Date;
}

export interface Profile {
  id: string;
  discordId: string;
  messagesCount: number;
  voiceSeconds: number;
  profileBannerUrl: string | null;
  walletId: string;
  createdAt: Date;
  updatedAt: Date;
  wallet: Wallet;
  characters: Character[];
  inventory?: (InventoryItem & { shopItem: ShopItem })[];
  userAwards?: UserAward[];
  selectedAward?: UserAward | null;
}

export class ProfileError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ProfileError";
  }
}
