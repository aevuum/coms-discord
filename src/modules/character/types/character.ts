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
  Familiar = "familiar",
  FamiliarDelete = "familiar_delete",
}

export enum CharacterTab {
  Profile = "profile",
  Inventory = "inventory",
  Stats = "stats",
  Familiar = "familiar",
  Runes = "runes",
  Status = "status",
}

export const ACTION_TABS: Partial<Record<ManageCharacterAction, CharacterTab>> = {
  [ManageCharacterAction.GiveItem]: CharacterTab.Inventory,
  [ManageCharacterAction.TakeItem]: CharacterTab.Inventory,
  [ManageCharacterAction.SetMana]: CharacterTab.Stats,
  [ManageCharacterAction.SetBalance]: CharacterTab.Stats,
  [ManageCharacterAction.Familiar]: CharacterTab.Familiar,
  [ManageCharacterAction.FamiliarDelete]: CharacterTab.Familiar,
  [ManageCharacterAction.Freeze]: CharacterTab.Status,
  [ManageCharacterAction.Unfreeze]: CharacterTab.Status,
  [ManageCharacterAction.Kill]: CharacterTab.Status,
};

export type CharacterFormInput = {
  name: string;
  age: string;
  specialRole: string;
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
