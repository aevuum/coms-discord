export type CharacterStatus = "ALIVE" | "DEAD" | "FROZEN";

export interface Character {
  id: string;
  rpName: string;
  status: CharacterStatus;
  avatarUrl: string | null;
  balanceKnuts: number;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Wallet {
  id: string;
  comsCoins: number;
  createdAt: Date;
  updatedAt: Date;
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
}
