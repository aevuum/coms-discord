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
  [CharacterFaculty.GRYFFINDOR]: "<:house_lion:1562485567977955409>",
  [CharacterFaculty.SLYTHERIN]: "<:house_snake:1562485569563398226>",
  [CharacterFaculty.HUFFLEPUFF]: "<:house_badger:1562485563431321782>",
  [CharacterFaculty.RAVENCLAW]: "<:house_eagle:1562485566178726008>",
  [CharacterFaculty.ADULT]: "<:adult_wizard:1562485558029320352>",
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
  public static age(age: number) {
    const lastTwo = age % 100;
    const last = age % 10;

    const word =
      lastTwo >= 11 && lastTwo <= 14
        ? "лет"
        : last === 1
          ? "год"
          : last >= 2 && last <= 4
            ? "года"
            : "лет";

    return `${age} ${word}`;
  }

  public static faculty(faculty: CharacterFaculty) {
    return `${facultyEmojis[faculty] ?? "🎓"} ${
      facultyLabels[faculty] ?? "Нет факультета"
    }`;
  }

  public static facultyLabel(faculty: CharacterFaculty) {
    return facultyLabels[faculty] ?? "Нет факультета";
  }

  public static facultyEmoji(faculty: CharacterFaculty) {
    return facultyEmojis[faculty] ?? "🎓";
  }

  public static statusLabel(status: CharacterStatus) {
    return statusLabels[status] ?? "Неизвестно";
  }

  public static status(status: CharacterStatus) {
    return `${statusEmojis[status] ?? "❓"} ${statusLabels[status] ?? "Неизвестно"}`;
  }
}
