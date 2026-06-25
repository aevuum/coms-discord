import {
  Character,
  CharacterStatus,
  CharacterFaculty,
} from "../../../database/generated/prisma/client.js";
import { UserRepository } from "../repositories/userRepository.js";

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

export class ProfileService {
  public static async getProfile(discordId: string) {
    return UserRepository.getByDiscordId(discordId);
  }

  public static async getOrCreateProfile(discordId: string) {
    let profile = await UserRepository.getByDiscordId(discordId);

    if (!profile) {
      profile = await UserRepository.create(discordId);
    }

    return profile;
  }

  public static formatVoice(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return `${hours}ч ${minutes}м`;
  }

  public static getFormattedCharactersList(
    characters: Character[],
  ): { text: string; avatarUrl: string | null }[] {
    const statusMap: Record<CharacterStatus, string> = {
      ALIVE: "<:172841lastmeadowbadge:1518587343378976779>",
      DEAD: "<:633509a:1518587362513256458>",
      FROZEN: "<:97970trialmoderator:1518587338513715260>",
    };

    return characters.map((character) => {
      const status = statusMap[character.status] ?? "❓";

      const faculty = facultyLabels[character.faculty] ?? "Нет факультета";

      const facultyEmoji = facultyEmojis[character.faculty] ?? "🎓";

      return {
        text: `${status} ${character.rpName}\n> ${facultyEmoji} ${faculty}`,
        avatarUrl: character.avatarUrl,
      };
    });
  }
}
