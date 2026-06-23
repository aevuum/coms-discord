import {
  Character,
  CharacterStatus,
} from "../../../database/generated/prisma/client.js";
import { UserRepository } from "../repositories/userRepository.js";

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
  public static formatCharacters(
    characters: Character[],
    placeholder: string = "Персонажи отсутствуют",
  ): string {
    if (!characters || characters.length === 0) {
      return placeholder;
    }

    const statusMap: Record<CharacterStatus, string> = {
      ALIVE: "<:172841lastmeadowbadge:1518587343378976779>",
      DEAD: "<:633509a:1518587362513256458>",
      FROZEN: "<:97970trialmoderator:1518587338513715260>",
    };

    return characters
      .map((character) => {
        const status = statusMap[character.status] ?? "❓";
        return `${status} ${character.rpName}`;
      })
      .join("\n");
  }
}
