import type { BaseInteraction } from "discord.js";

import {
  CharacterFaculty,
  CharacterStatus,
} from "../../../database/generated/prisma/client.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { UserRepository } from "../../users/repositories/userRepository.js";
import { Currency, MAX_BALANCE_KNUTS } from "../../economy/lib/currency.js";
import { Storage } from "../../../lib/storage.js";
import { CharacterRepository } from "../repositories/characterRepository.js";
import { TupperService } from "../../tupper/service/tupperService.js";
import { PendingTraitService } from "../../rolls/service/pendingTraitService.js";
import {
  CharacterError,
  ManageCharacterAction,
  type CharacterFormInput,
} from "../types/character.js";

export class CharacterService {
  public static readonly MANAGE_KEY = "manage.characters";

  private static readonly MAX_MANA = 10_000;

  private static readonly MAX_AGE = 1000;

  public static async assertCanManage(interaction: BaseInteraction) {
    const subject = await PermissionService.resolveSubject(interaction);

    if (!(await PermissionService.canUse(subject, this.MANAGE_KEY))) {
      throw new CharacterError("У вас нет доступа к управлению персонажами.");
    }
  }

  public static async create(discordId: string, input: CharacterFormInput) {
    const { name, age, specialRole, faculty } = this.parseForm(input);

    let user = await UserRepository.getByDiscordId(discordId);

    if (!user) {
      user = await UserRepository.create(discordId);
    }

    const avatarPath = input.avatar ? await Storage.uploadAttachment(input.avatar) : null;

    const character = await CharacterRepository.create(
      user.id,
      name,
      avatarPath,
      faculty,
      age,
      specialRole,
    ).catch(async (error) => {
      await Storage.delete(avatarPath);
      throw error;
    });

    try {
      await TupperService.createForCharacter(character.id, character.rpName);
    } catch (error) {
      await CharacterRepository.delete(character.id);
      await Storage.delete(avatarPath);
      throw error;
    }

    await PendingTraitService.consume(discordId).catch(() => null);

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
        await Storage.delete(character.avatarPath);
        await Storage.delete(character.familiar?.imagePath);
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

  public static async setMana(
    discordId: string,
    characterId: string,
    currentInput: string,
    maxInput: string,
  ) {
    const character = await CharacterRepository.getById(characterId);

    if (!character || character.user.discordId !== discordId) {
      throw new CharacterError("Персонаж не найден.");
    }

    const maxMana = this.parseInteger(maxInput, "Максимальная мана");

    if (maxMana < 1 || maxMana > this.MAX_MANA) {
      throw new CharacterError(
        `Максимальная мана должна быть от 1 до ${this.MAX_MANA}.`,
      );
    }

    const mana = this.parseInteger(currentInput, "Текущая мана");

    if (mana > maxMana || mana < -this.MAX_MANA) {
      throw new CharacterError(
        `Текущая мана должна быть от −${this.MAX_MANA} до максимальной (${maxMana}).`,
      );
    }

    return CharacterRepository.updateMana(character.id, mana, maxMana);
  }

  public static async setBalance(
    discordId: string,
    characterId: string,
    input: { galleons: string; sickles: string; knuts: string; reason: string },
  ) {
    const character = await this.getOwned(discordId, characterId);

    const galleons = this.parseAmount(input.galleons, "Галлеоны");
    const sickles = this.parseAmount(input.sickles, "Сикли");
    const knuts = this.parseAmount(input.knuts, "Кнаты");

    const total = Currency.toKnuts(galleons, sickles, knuts);

    if (total > MAX_BALANCE_KNUTS) {
      throw new CharacterError("Баланс слишком большой.");
    }

    const change = total - character.balanceKnuts;

    const updated = await CharacterRepository.setBalance(
      character.id,
      total,
      change,
      input.reason.trim().slice(0, 200) || "Изменение куратором",
    );

    return { character: updated, change };
  }

  public static async edit(discordId: string, characterId: string, input: CharacterFormInput) {
    const character = await this.getOwned(discordId, characterId);

    const { name, age, specialRole, faculty } = this.parseForm(input);

    const avatarPath = input.avatar ? await Storage.uploadAttachment(input.avatar) : null;

    const updated = await CharacterRepository.updateDetails(character.id, {
      rpName: name,
      age,
      specialRole,
      faculty,
      ...(avatarPath ? { avatarPath } : {}),
    });

    if (avatarPath) {
      await Storage.delete(character.avatarPath);
    }

    await TupperService.syncCharacter(character.id, character.rpName, name);

    return updated;
  }

  private static parseForm(input: CharacterFormInput) {
    const name = input.name.trim();

    if (name.length < 2 || name.length > 80) {
      throw new CharacterError("Имя персонажа должно быть от 2 до 80 символов.");
    }

    if (!Object.values(CharacterFaculty).includes(input.faculty)) {
      throw new CharacterError("Выберите факультет персонажа.");
    }

    return {
      name,
      age: this.parseAge(input.age),
      specialRole: input.specialRole.trim().slice(0, 60) || null,
      faculty: input.faculty,
    };
  }

  private static parseAge(input: string) {
    const text = input.trim();

    if (!text) {
      return null;
    }

    const age = this.parseInteger(text, "Возраст");

    if (age < 1 || age > this.MAX_AGE) {
      throw new CharacterError(`Возраст должен быть от 1 до ${this.MAX_AGE} лет.`);
    }

    return age;
  }

  private static async getOwned(discordId: string, characterId: string) {
    const character = await CharacterRepository.getById(characterId);

    if (!character || character.user.discordId !== discordId) {
      throw new CharacterError("Персонаж не найден.");
    }

    return character;
  }

  private static parseAmount(input: string, label: string) {
    const text = input.trim() || "0";

    if (!/^\d+$/.test(text)) {
      throw new CharacterError(`Поле «${label}» должно быть целым неотрицательным числом.`);
    }

    return Number(text);
  }

  private static parseInteger(input: string, label: string) {
    const text = input.trim().replace("−", "-");

    if (!/^-?\d+$/.test(text)) {
      throw new CharacterError(`Поле «${label}» должно быть целым числом.`);
    }

    return Number(text);
  }
}
