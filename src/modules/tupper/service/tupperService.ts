import { TupperRepository } from "../repositories/tupperRepository.js";

export class TupperService {
  public static async createForCharacter(characterId: string, name: string) {
    const prefix = this.generatePrefix(name);

    return TupperRepository.create(characterId, name, prefix);
  }

  public static generatePrefix(name: string) {
    const clear = name
      .trim()
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]/gi, "");

    return `${clear}:`;
  }

  public static async rename(characterId: string, name: string) {
    name = name.trim();

    if (name.length < 2 || name.length > 80) {
      throw new Error("Некорректная длина имени.");
    }

    return TupperRepository.updateName(characterId, name);
  }

  public static async changePrefix(characterId: string, prefix: string) {
    prefix = prefix.trim();

    if (!prefix.length) {
      throw new Error("Тег не может быть пустым.");
    }

    if (prefix.length > 32) {
      throw new Error("Тег слишком длинный.");
    }

    const exists = await TupperRepository.getByPrefix(prefix);

    if (exists && exists.characterId !== characterId) {
      throw new Error("Такой тег уже используется.");
    }

    return TupperRepository.updatePrefix(characterId, prefix);
  }
}
