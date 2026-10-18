import { Character } from "../../../database/generated/prisma/client.js";
import { UserRepository } from "../repositories/userRepository.js";
import { CharacterRepository } from "../../character/repositories/characterRepository.js";
import { CharacterFormatter } from "../../economy/lib/characterFormatter.js";
import { ProfileError } from "../types/profile.js";
import { CharacterInventoryService } from "../../character/service/characterInventoryService.js";
import type { CardItem } from "../lib/characterCardContainer.js";
import { Storage } from "../../../lib/storage.js";

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
    return characters.map((character) => ({
      text: [
        `**${character.rpName}**`,
        `> ${CharacterFormatter.faculty(character.faculty)}`,
        `> ${CharacterFormatter.status(character.status)}`,
      ].join("\n"),
      avatarUrl: Storage.media(character.avatarPath, character.avatarUrl),
    }));
  }

  public static async getOwnedCharacter(
    discordId: string,
    characterId: string,
  ) {
    const character = characterId
      ? await CharacterRepository.getById(characterId)
      : null;

    if (!character) {
      throw new ProfileError("Персонаж не найден.");
    }

    if (character.user.discordId !== discordId) {
      throw new ProfileError(
        "Карточку персонажа может открыть только его владелец.",
      );
    }

    return character;
  }

  public static async getCharacterInventory(characterId: string): Promise<CardItem[]> {
    const items = await CharacterInventoryService.list(characterId);

    return items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      imageUrl: Storage.url(item.imagePath),
    }));
  }
}
