import type { Attachment } from "discord.js";

import type { CharacterFaculty } from "../../../database/generated/prisma/client.js";

export class CharacterError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CharacterError";
  }
}

export enum ManageCharacterAction {
  Create = "create",
  Delete = "delete",
  Freeze = "freeze",
  Unfreeze = "unfreeze",
  Kill = "kill",
  GiveItem = "give_item",
  TakeItem = "take_item",
  SetMana = "mana",
  SetBalance = "balance",
  Edit = "edit",
}

export enum CharacterCategory {
  Characters = "characters",
  Status = "status",
  Inventory = "inventory",
  Mana = "mana",
  Economy = "economy",
}

export type CharacterFormInput = {
  name: string;
  age: string;
  avatar: Attachment | null;
  faculty: CharacterFaculty;
};

export type CharacterCreateInput = {
  discordId: string;
  rpName: string;
  avatarUrl: string | null;
  faculty: CharacterFaculty;
};

export type InventoryListItem = {
  id: string;
  characterId: string;
  name: string;
  quantity: number;
  imagePath: string | null;
  createdAt: Date;
};
