import { CharacterFaculty } from "../../../database/generated/prisma/client.js";

export const POINTS_MANAGE_KEY = "manage.points";
export const POINTS_AWARD_KEY = "points.award";
export const POINTS_MAX_DELTA = 500;

export const HOUSES = [
  CharacterFaculty.GRYFFINDOR,
  CharacterFaculty.SLYTHERIN,
  CharacterFaculty.RAVENCLAW,
  CharacterFaculty.HUFFLEPUFF,
] as const;

export type House = (typeof HOUSES)[number];

export const HOUSE_LABELS: Record<House, string> = {
  [CharacterFaculty.GRYFFINDOR]: "Гриффиндор",
  [CharacterFaculty.SLYTHERIN]: "Слизерин",
  [CharacterFaculty.RAVENCLAW]: "Когтевран",
  [CharacterFaculty.HUFFLEPUFF]: "Пуффендуй",
};

export const HOUSE_EMOJIS: Record<House, string> = {
  [CharacterFaculty.GRYFFINDOR]: "<:house_lion:1562485567977955409>",
  [CharacterFaculty.SLYTHERIN]: "<:house_snake:1562485569563398226>",
  [CharacterFaculty.RAVENCLAW]: "<:house_eagle:1562485566178726008>",
  [CharacterFaculty.HUFFLEPUFF]: "<:house_badger:1562485563431321782>",
};

export type PointsChange = {
  faculty: House;
  delta: number;
};

export class PointsError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PointsError";
  }
}
