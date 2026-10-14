import type {
  Character,
  CharacterTupper,
  User,
} from "../../../database/generated/prisma/client.js";

export class TupperError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TupperError";
  }
}

export type TupperCharacter = Character & {
  user: User;
  tupper: CharacterTupper | null;
};
