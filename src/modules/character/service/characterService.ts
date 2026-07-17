import {
  CharacterFaculty,
  CharacterStatus,
} from "../../../database/generated/prisma/client.js";

import { UserRepository } from "../../users/repositories/userRepository.js";
import { CharacterRepository } from "../repositories/characterRepository.js";
import { TupperService } from "../../tupper/service/tupperService.js";

export class CharacterService {
  public static async create(
    discordId: string,
    rpName: string,
    avatarUrl: string | null,
    faculty: CharacterFaculty,
  ) {
    let user = await UserRepository.getByDiscordId(discordId);

    if (!user) {
      user = await UserRepository.create(discordId);
    }

    const character = await CharacterRepository.create(
      user.id,
      rpName,
      avatarUrl,
      faculty,
    );

    await TupperService.createForCharacter(character.id, character.rpName);

    return character;
  }

  public static async getCharacters(discordId: string) {
    const user = await UserRepository.getByDiscordId(discordId);

    if (!user) {
      return [];
    }

    return CharacterRepository.getUserCharacters(user.id);
  }

  public static getCharacterById(id: string) {
    return CharacterRepository.getById(id);
  }

  public static async remove(characterId: string) {
    const character = await CharacterRepository.getById(characterId);

    if (!character) {
      throw new Error("Персонаж не найден");
    }

    return CharacterRepository.delete(characterId);
  }

  public static async freeze(characterId: string) {
    return CharacterRepository.updateStatus(
      characterId,
      CharacterStatus.FROZEN,
    );
  }

  public static async unfreeze(characterId: string) {
    return CharacterRepository.updateStatus(characterId, CharacterStatus.ALIVE);
  }

  public static async kill(characterId: string) {
    return CharacterRepository.updateStatus(characterId, CharacterStatus.DEAD);
  }
}
