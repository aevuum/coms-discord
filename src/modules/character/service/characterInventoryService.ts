import type { Attachment } from "discord.js";

import {
  CharacterInventoryRepository,
  type ItemImage,
} from "../repositories/characterInventoryRepository.js";
import { CharacterRepository } from "../repositories/characterRepository.js";
import { CharacterError } from "../types/character.js";

const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
]);

const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

export class CharacterInventoryService {
  public static readonly MAX_IMAGE_BYTES = 4 * 1024 * 1024;

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

  public static async listWithImages(characterId: string) {
    return CharacterInventoryRepository.listWithImages(characterId);
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

    const image = attachment ? await this.downloadImage(attachment) : null;

    const item = await CharacterInventoryRepository.give(
      character.id,
      name,
      name.toLocaleLowerCase("ru"),
      quantity,
      image,
    );

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

    return {
      character,
      item,
      quantity,
    };
  }

  public static attachmentName(itemId: string, mime: string | null) {
    return `item-${itemId}.${MIME_EXTENSIONS[mime ?? ""] ?? "png"}`;
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

  private static async downloadImage(attachment: Attachment): Promise<ItemImage> {
    const mime = (attachment.contentType ?? "").split(";")[0].trim();

    if (!ALLOWED_MIME.has(mime)) {
      throw new CharacterError("Фото должно быть в формате PNG, JPG, GIF или WEBP.");
    }

    if (attachment.size > this.MAX_IMAGE_BYTES) {
      throw new CharacterError("Фото должно быть не больше 4 МБ.");
    }

    const response = await fetch(attachment.url, {
      signal: AbortSignal.timeout(15_000),
    }).catch(() => null);

    if (!response?.ok) {
      throw new CharacterError("Не удалось загрузить фото. Попробуйте ещё раз.");
    }

    const buffer = new Uint8Array(await response.arrayBuffer());

    if (buffer.byteLength > this.MAX_IMAGE_BYTES) {
      throw new CharacterError("Фото должно быть не больше 4 МБ.");
    }

    return {
      data: buffer,
      mime,
    };
  }
}
