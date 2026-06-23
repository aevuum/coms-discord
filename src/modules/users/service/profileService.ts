import { UserRepository } from "../repositories/userRepository.js";
import { Character, CharacterStatus } from "../types/profile.js";

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
      ALIVE: "🟢",
      DEAD: "🔴",
      FROZEN: "🧊",
    };

    return characters
      .map((character) => {
        const status = statusMap[character.status] ?? "❓";
        return `${status} ${character.rpName}`;
      })
      .join("\n");
  }
}
