import prisma from "../../../database/prisma.js";
import { CharacterRepository } from "../../character/repositories/characterRepository.js";
import { CharacterService } from "../../character/service/characterService.js";
import { CharacterError } from "../../character/types/character.js";
import { RUNE_MAX_PROGRESS, RUNES, getRune, type Rune } from "../lib/runeCatalog.js";

export class RuneError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "RuneError";
  }
}

export type LearnedRune = {
  rune: Rune;
  progress: number;
};

export class RuneService {
  public static getCharacters(discordId: string) {
    return CharacterService.getCharacters(discordId);
  }

  public static async getOwnedCharacter(discordId: string, characterId: string) {
    const character = await CharacterRepository.getById(characterId);

    if (!character || character.user.discordId !== discordId) {
      throw new RuneError("Персонаж не найден.");
    }

    return character;
  }

  public static async learned(characterId: string): Promise<LearnedRune[]> {
    const records = await prisma.characterRune.findMany({ where: { characterId } });

    return RUNES.flatMap((rune) => {
      const record = records.find((entry) => entry.runeKey === rune.key);

      return record ? [{ rune, progress: record.progress }] : [];
    });
  }

  public static async set(characterId: string, runeKey: string, input: string) {
    const rune = getRune(runeKey);

    if (!rune) {
      throw new CharacterError("Руна не найдена.");
    }

    const text = input.trim();

    if (!text) {
      await prisma.characterRune.deleteMany({ where: { characterId, runeKey } });

      return { rune, progress: null };
    }

    if (!/^\d+$/.test(text) || Number(text) > RUNE_MAX_PROGRESS) {
      throw new CharacterError(`Степень изучения должна быть целым числом от 0 до ${RUNE_MAX_PROGRESS}.`);
    }

    const progress = Number(text);

    await prisma.characterRune.upsert({
      where: { characterId_runeKey: { characterId, runeKey } },
      create: { characterId, runeKey, progress },
      update: { progress },
    });

    return { rune, progress };
  }
}
