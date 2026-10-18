import { UserRepository } from "../../users/repositories/userRepository.js";
import { CharacterRepository } from "../../character/repositories/characterRepository.js";
import { TupperRepository } from "../repositories/tupperRepository.js";
import { TupperError, type TupperCharacter } from "../types/tupper.js";

export class TupperService {
  private static readonly NAME_MIN_LENGTH = 2;
  private static readonly NAME_MAX_LENGTH = 80;
  private static readonly PREFIX_MAX_LENGTH = 32;
  private static readonly PREFIX_BASE_MAX_LENGTH = 24;
  private static readonly FORBIDDEN_NAME = /discord|clyde/i;

  public static async loadCache() {
    return TupperRepository.loadCache();
  }

  public static async getCharacters(
    discordId: string,
  ): Promise<TupperCharacter[]> {
    const user = await UserRepository.getByDiscordId(discordId);

    const characters = user
      ? await CharacterRepository.getUserCharacters(user.id)
      : [];

    if (!characters.length) {
      throw new TupperError("У вас нет персонажей.");
    }

    return characters;
  }

  public static async getOwnedCharacter(
    discordId: string,
    characterId: string,
  ): Promise<TupperCharacter> {
    const character = characterId
      ? await CharacterRepository.getById(characterId)
      : null;

    if (!character || character.user.discordId !== discordId) {
      throw new TupperError("Это не ваш персонаж.");
    }

    return character;
  }

  public static async createForCharacter(characterId: string, name: string) {
    const prefix = await this.generatePrefix(name);

    return TupperRepository.create(
      characterId,
      this.sanitizeName(name),
      prefix,
    );
  }

  public static async syncCharacter(characterId: string, oldName: string, newName: string) {
    const tupper = await TupperRepository.findByCharacter(characterId);

    if (tupper && oldName !== newName && tupper.name === this.sanitizeName(oldName)) {
      await TupperRepository.updateName(characterId, this.sanitizeName(newName));
    }

    await this.loadCache();
  }

  public static async removeForCharacter(characterId: string) {
    return TupperRepository.delete(characterId);
  }

  public static async rename(
    discordId: string,
    characterId: string,
    input: string,
  ) {
    const character = await this.getOwnedCharacter(discordId, characterId);

    const name = input.trim();

    if (
      name.length < this.NAME_MIN_LENGTH ||
      name.length > this.NAME_MAX_LENGTH
    ) {
      throw new TupperError(
        `Имя должно быть от ${this.NAME_MIN_LENGTH} до ${this.NAME_MAX_LENGTH} символов.`,
      );
    }

    if (this.FORBIDDEN_NAME.test(name)) {
      throw new TupperError(
        "Имя не может содержать слова «discord» или «clyde».",
      );
    }

    await this.ensureTupper(character);

    await TupperRepository.updateName(character.id, name);

    return this.getOwnedCharacter(discordId, characterId);
  }

  public static async changePrefix(
    discordId: string,
    characterId: string,
    input: string,
  ) {
    const character = await this.getOwnedCharacter(discordId, characterId);

    const prefix = input.trim();

    if (!prefix.length) {
      throw new TupperError("Тег не может быть пустым.");
    }

    if (prefix.length > this.PREFIX_MAX_LENGTH) {
      throw new TupperError(
        `Тег не может быть длиннее ${this.PREFIX_MAX_LENGTH} символов.`,
      );
    }

    const exists = await TupperRepository.getByPrefix(prefix);

    if (exists && exists.characterId !== character.id) {
      throw new TupperError("Такой тег уже используется.");
    }

    await this.ensureTupper(character);

    await TupperRepository.updatePrefix(character.id, prefix);

    return this.getOwnedCharacter(discordId, characterId);
  }

  private static async ensureTupper(character: TupperCharacter) {
    if (!character.tupper) {
      await this.createForCharacter(character.id, character.rpName);
    }
  }

  private static sanitizeName(name: string) {
    const clean = name
      .trim()
      .replace(this.FORBIDDEN_NAME, "")
      .trim()
      .slice(0, this.NAME_MAX_LENGTH);

    return clean.length >= this.NAME_MIN_LENGTH ? clean : "Персонаж";
  }

  private static async generatePrefix(name: string) {
    const base =
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-zа-яё0-9]/gi, "")
        .slice(0, this.PREFIX_BASE_MAX_LENGTH) || "персонаж";

    for (let index = 1; index <= 100; index++) {
      const prefix = index === 1 ? `${base}:` : `${base}${index}:`;

      if (!(await TupperRepository.getByPrefix(prefix))) {
        return prefix;
      }
    }

    throw new TupperError("Не удалось подобрать свободный тег.");
  }
}
