import type { Attachment } from "discord.js";

import prisma from "../../../database/prisma.js";
import { Storage } from "../../../lib/storage.js";
import { CharacterError } from "../types/character.js";
import { CharacterInventoryService } from "./characterInventoryService.js";

export type FamiliarInput = {
  name: string;
  description: string;
  image: Attachment | null;
};

export class FamiliarService {
  public static get(characterId: string) {
    return prisma.characterFamiliar.findUnique({ where: { characterId } });
  }

  public static async save(discordId: string, characterId: string, input: FamiliarInput) {
    const character = await CharacterInventoryService.getOwnedCharacter(discordId, characterId);

    const name = input.name.trim();
    const description = input.description.trim();

    if (name.length < 2 || name.length > 80) {
      throw new CharacterError("Имя фамильяра должно быть от 2 до 80 символов.");
    }

    if (!description.length) {
      throw new CharacterError("Опишите фамильяра.");
    }

    const existing = await this.get(character.id);

    if (!existing && !input.image) {
      throw new CharacterError("Загрузите изображение фамильяра.");
    }

    const imagePath = input.image ? await Storage.uploadAttachment(input.image) : null;

    const familiar = await prisma.characterFamiliar
      .upsert({
        where: { characterId: character.id },
        create: { characterId: character.id, name, description: description.slice(0, 1500), imagePath },
        update: { name, description: description.slice(0, 1500), ...(imagePath ? { imagePath } : {}) },
      })
      .catch(async (error) => {
        await Storage.delete(imagePath);
        throw error;
      });

    if (imagePath && existing?.imagePath) {
      await Storage.delete(existing.imagePath);
    }

    return familiar;
  }

  public static async remove(discordId: string, characterId: string) {
    const character = await CharacterInventoryService.getOwnedCharacter(discordId, characterId);
    const familiar = await this.get(character.id);

    if (!familiar) {
      throw new CharacterError("У персонажа нет фамильяра.");
    }

    await prisma.characterFamiliar.delete({ where: { id: familiar.id } });
    await Storage.delete(familiar.imagePath);

    return familiar;
  }
}
