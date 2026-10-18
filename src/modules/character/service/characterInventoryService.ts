import type { Attachment } from "discord.js";

import { Storage } from "../../../lib/storage.js";
import { CharacterInventoryRepository } from "../repositories/characterInventoryRepository.js";
import { CharacterRepository } from "../repositories/characterRepository.js";
import { CharacterError } from "../types/character.js";

export class CharacterInventoryService {
  public static readonly MAX_QUANTITY = 10_000;

  public static async getOwnedCharacter(discordId: string, characterId: string) {
    const character = await CharacterRepository.getById(characterId);

    if (!character || character.user.discordId !== discordId) {
      throw new CharacterError("Персонаж не найден.");
    }

    return character;
  }

  public static async list(characterId: string) {
    return CharacterInventoryRepository.list(characterId);
  }

  public static async getItem(characterId: string, itemId: string) {
    const item = itemId ? await CharacterInventoryRepository.getById(itemId) : null;

    if (!item || item.characterId !== characterId) {
      throw new CharacterError("Предмет не найден.");
    }

    return item;
  }

  public static async give(
    discordId: string,
    characterId: string,
    nameInput: string,
    quantityInput: string,
    attachment: Attachment | null,
  ) {
    const character = await this.getOwnedCharacter(discordId, characterId);

    const name = nameInput.trim().replace(/\s+/g, " ");

    if (name.length < 1 || name.length > 80) {
      throw new CharacterError("Название предмета должно быть от 1 до 80 символов.");
    }

    const quantity = this.parseQuantity(quantityInput);

    const nameKey = name.toLocaleLowerCase("ru");

    const imagePath = attachment ? await Storage.uploadAttachment(attachment) : null;

    const previous = imagePath
      ? await CharacterInventoryRepository.findByKey(character.id, nameKey)
      : null;

    const item = await CharacterInventoryRepository.give(
      character.id,
      name,
      nameKey,
      quantity,
      imagePath,
    ).catch(async (error) => {
      await Storage.delete(imagePath);
      throw error;
    });

    if (previous?.imagePath && previous.imagePath !== imagePath) {
      await Storage.delete(previous.imagePath);
    }

    return {
      character,
      item,
      quantity,
    };
  }

  public static async take(
    discordId: string,
    characterId: string,
    itemId: string,
    quantityInput: string,
  ) {
    const character = await this.getOwnedCharacter(discordId, characterId);

    await this.getItem(character.id, itemId);

    const quantity = this.parseQuantity(quantityInput);

    const item = await CharacterInventoryRepository.take(itemId, quantity);

    if (item.quantity <= 0) {
      await Storage.delete(item.imagePath);
    }

    return {
      character,
      item,
      quantity,
    };
  }

  private static parseQuantity(input: string) {
    const text = input.trim() || "1";

    if (!/^\d+$/.test(text)) {
      throw new CharacterError("Количество должно быть целым положительным числом.");
    }

    const quantity = Number(text);

    if (quantity < 1 || quantity > this.MAX_QUANTITY) {
      throw new CharacterError(
        `Количество должно быть от 1 до ${this.MAX_QUANTITY}.`,
      );
    }

    return quantity;
  }
}
