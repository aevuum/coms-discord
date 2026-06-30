import { TransactionType } from "../../../database/generated/prisma/client.js";

import { UserRepository } from "../../users/repositories/userRepository.js";
import { EconomyCache } from "../cache/economyCache.js";

import { Currency } from "../lib/currency.js";
import { EconomyRepository } from "../repositories/economyRepository.js";
import { TransactionRepository } from "../repositories/transactionRepository.js";

export class EconomyService {
  public static async getCharacters(discordId: string) {
    const user = await UserRepository.getByDiscordId(discordId);

    if (!user) {
      return [];
    }

    return EconomyRepository.getUserCharacters(user.id);
  }

  public static async getAllReceivers(discordId: string) {
    const user = await UserRepository.getByDiscordId(discordId);

    if (!user) {
      return [];
    }

    return EconomyRepository.getUserCharacters(user.id);
  }

  public static async getCharacter(characterId: string) {
    const character = await EconomyRepository.getCharacter(characterId);

    if (!character) {
      throw new Error("Персонаж не найден.");
    }

    return character;
  }

  public static async getOwnedCharacter(
    discordId: string,
    characterId: string,
  ) {
    const characters = await this.getCharacters(discordId);

    const character = characters.find((item) => item.id === characterId);

    if (!character) {
      throw new Error("Этот персонаж вам не принадлежит.");
    }

    return character;
  }

  public static async transfer(
    discordId: string,
    senderId: string,
    receiverId: string,
    input: string,
  ) {
    const sender = await this.getOwnedCharacter(discordId, senderId);

    const receiver = await this.getCharacter(receiverId);

    if (sender.id === receiver.id) {
      throw new Error("Нельзя переводить деньги самому себе.");
    }

    if (sender.userId === receiver.userId) {
      throw new Error("Нельзя переводить деньги между своими персонажами.");
    }

    const amount = Currency.parse(input);

    if (!Currency.canAfford(sender.balanceKnuts, amount)) {
      throw new Error("Недостаточно средств.");
    }

    const result = await EconomyRepository.transfer(
      sender.id,
      receiver.id,
      amount,
    );

    await Promise.all([
      TransactionRepository.create(
        sender.id,
        TransactionType.TRANSFER_OUT,
        -amount,
        result.sender.balanceKnuts,
        `Перевод персонажу ${receiver.rpName}`,
      ),

      TransactionRepository.create(
        receiver.id,
        TransactionType.TRANSFER_IN,
        amount,
        result.receiver.balanceKnuts,
        `Перевод от персонажа ${sender.rpName}`,
      ),
    ]);

    return result;
  }

  public static async history(discordId: string, characterId: string) {
    await this.getOwnedCharacter(discordId, characterId);

    return TransactionRepository.getHistory(characterId);
  }

  public static async getTransferUsers(discordId: string) {
    const cached = EconomyCache.getUsers();

    if (cached) {
      return cached.filter((user) => user.discordId !== discordId);
    }

    const users = await UserRepository.getTransferUsers(discordId);

    EconomyCache.setUsers(users);

    return users;
  }

  public static async getUserCharactersByDiscordId(discordId: string) {
    const user = await UserRepository.getByDiscordId(discordId);

    if (!user) {
      return [];
    }

    return user.characters.map((character) => ({
      id: character.id,
      rpName: character.rpName,
    }));
  }
}
