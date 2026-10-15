import {
  CharacterFaculty,
  CharacterStatus,
} from "../../../database/generated/prisma/client.js";

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
  [CharacterFaculty.ADULT]: "<:515636magicwandids:1519585028596563968>",
};

const statusLabels: Record<CharacterStatus, string> = {
  [CharacterStatus.ALIVE]: "Активен",
  [CharacterStatus.FROZEN]: "Заморожен",
  [CharacterStatus.DEAD]: "Мёртв",
};

const statusEmojis: Record<CharacterStatus, string> = {
  [CharacterStatus.ALIVE]: "<:172841lastmeadowbadge:1518587343378976779>",
  [CharacterStatus.FROZEN]: "<:97970trialmoderator:1518587338513715260>",
  [CharacterStatus.DEAD]: "<:633509a:1518587362513256458>",
};

export class CharacterFormatter {
  public static faculty(faculty: CharacterFaculty) {
    return `${facultyEmojis[faculty] ?? "🎓"} ${
      facultyLabels[faculty] ?? "Нет факультета"
    }`;
  }

  public static status(status: CharacterStatus) {
    return `${statusEmojis[status] ?? "❓"} ${statusLabels[status] ?? "Неизвестно"}`;
  }
}
