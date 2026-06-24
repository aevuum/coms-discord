import {
  Character,
  CharacterFaculty,
  CharacterStatus,
} from "../../../database/generated/prisma/client.js";

export type ManageCharacterAction =
  | "create"
  | "delete"
  | "freeze"
  | "unfreeze"
  | "kill";

export type CharacterCreateData = {
  userId: string;
  rpName: string;
  avatarUrl?: string | null;
  faculty: CharacterFaculty;
};

export type CharacterSelectData = {
  action: ManageCharacterAction;
  userId: string;
};

export type ManagedCharacter = Character & {
  status: CharacterStatus;
};
