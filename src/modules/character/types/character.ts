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
}

export type CharacterCreateInput = {
  discordId: string;
  rpName: string;
  avatarUrl: string | null;
  faculty: CharacterFaculty;
};
