import { CharacterFaculty } from "../../../database/generated/prisma/client.js";

const facultyLabels: Record<CharacterFaculty, string> = {
  [CharacterFaculty.GRYFFINDOR]: "Гриффиндор",
  [CharacterFaculty.SLYTHERIN]: "Слизерин",
  [CharacterFaculty.HUFFLEPUFF]: "Пуффендуй",
  [CharacterFaculty.RAVENCLAW]: "Когтевран",
  [CharacterFaculty.ADULT]: "Взрослый",
};

const facultyEmojis: Record<CharacterFaculty, string> = {
  [CharacterFaculty.GRYFFINDOR]: "<:grifinoria:1519583216992784567>",
  [CharacterFaculty.SLYTHERIN]: "<:slytherincrest:1519583221988196392>",
  [CharacterFaculty.HUFFLEPUFF]: "<:hufflepuff:1519583218544676873>",
  [CharacterFaculty.RAVENCLAW]: "<:ravenclaw:1519583220327252048>",
  [CharacterFaculty.ADULT]: "<:515636magicwandids:1518585028596563968>",
};

export class CharacterFormatter {
  public static faculty(faculty: CharacterFaculty) {
    return `${facultyEmojis[faculty] ?? "🎓"} ${
      facultyLabels[faculty] ?? "Нет факультета"
    }`;
  }
}
