import type {
  InventoryItem,
  ShopItem,
} from "../../../database/generated/prisma/client.js";

export class ShopError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ShopError";
  }
}

export type ShopItemInput = {
  name: string;
  emoji: string;
  description: string;
  price: string;
  maxPerUser: string;
};

export type ShopItemData = {
  name: string;
  emoji: string | null;
  description: string | null;
  price: number;
  maxPerUser: number | null;
};

export type InventoryEntry = InventoryItem & {
  shopItem: ShopItem;
};

export type PurchaseResult = {
  item: ShopItem;
  balance: number;
  quantity: number;
};
