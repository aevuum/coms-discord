import type { BaseInteraction } from "discord.js";

import {
  CharacterFaculty,
  CharacterStatus,
} from "../../../database/generated/prisma/client.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { UserRepository } from "../../users/repositories/userRepository.js";
import { CharacterRepository } from "../repositories/characterRepository.js";
import { TupperService } from "../../tupper/service/tupperService.js";
import { CharacterError, ManageCharacterAction } from "../types/character.js";

export class CharacterService {
  public static readonly MANAGE_KEY = "manage.characters";

  public static async assertCanManage(interaction: BaseInteraction) {
    const subject = await PermissionService.resolveSubject(interaction);

    if (!(await PermissionService.canUse(subject, this.MANAGE_KEY))) {
      throw new CharacterError("У вас нет доступа к управлению персонажами.");
    }
  }

  public static async create(
    discordId: string,
    rpName: string,
    avatarUrl: string | null,
    faculty: CharacterFaculty,
  ) {
    const name = rpName.trim();

    if (name.length < 2 || name.length > 80) {
      throw new CharacterError("Имя персонажа должно быть от 2 до 80 символов.");
    }

    if (!Object.values(CharacterFaculty).includes(faculty)) {
      throw new CharacterError("Выберите факультет персонажа.");
    }

    let user = await UserRepository.getByDiscordId(discordId);

    if (!user) {
      user = await UserRepository.create(discordId);
    }

    const character = await CharacterRepository.create(
      user.id,
      name,
      avatarUrl,
      faculty,
    );

    try {
      await TupperService.createForCharacter(character.id, character.rpName);
    } catch (error) {
      await CharacterRepository.delete(character.id);
      throw error;
    }

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

  public static async apply(
    action: ManageCharacterAction,
    discordId: string,
    characterId: string,
  ) {
    const character = await CharacterRepository.getById(characterId);

    if (!character || character.user.discordId !== discordId) {
      throw new CharacterError("Персонаж не найден.");
    }

    switch (action) {
      case ManageCharacterAction.Delete:
        await TupperService.removeForCharacter(character.id);
        await CharacterRepository.delete(character.id);
        break;

      case ManageCharacterAction.Freeze:
        await CharacterRepository.updateStatus(
          character.id,
          CharacterStatus.FROZEN,
        );
        break;

      case ManageCharacterAction.Unfreeze:
        await CharacterRepository.updateStatus(
          character.id,
          CharacterStatus.ALIVE,
        );
        break;

      case ManageCharacterAction.Kill:
        await CharacterRepository.updateStatus(
          character.id,
          CharacterStatus.DEAD,
        );
        break;

      default:
        throw new CharacterError("Неизвестное действие.");
    }

    return character;
  }
}
