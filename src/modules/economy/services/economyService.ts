import { CharacterStatus } from "../../../database/generated/prisma/client.js";

import { UserRepository } from "../../users/repositories/userRepository.js";

import { Currency, MAX_BALANCE_KNUTS } from "../lib/currency.js";
import { EconomyRepository } from "../repositories/economyRepository.js";
import { TransactionRepository } from "../repositories/transactionRepository.js";
import {
  EconomyError,
  type CharacterCard,
  type HistoryPage,
  type TransferPreview,
  type TransferReceivers,
  type TransferResult,
} from "../types/economy.js";

export class EconomyService {
  private static readonly HISTORY_PAGE_SIZE = 8;

  public static async getCharacters(discordId: string) {
    const user = await UserRepository.getByDiscordId(discordId);

    if (!user) {
      return [];
    }

    return EconomyRepository.getUserCharacters(user.id);
  }

  public static async getOverview(discordId: string) {
    const characters = await this.getCharacters(discordId);

    if (!characters.length) {
      throw new EconomyError("У вас нет зарегистрированных персонажей.");
    }

    return characters;
  }

  public static async getOwnedCharacter(
    discordId: string,
    characterId: string,
  ) {
    const character = characterId
      ? await EconomyRepository.getCharacter(characterId)
      : null;

    if (!character || character.user.discordId !== discordId) {
      throw new EconomyError("Этот персонаж вам не принадлежит.");
    }

    return character;
  }

  public static async getCharacterCard(
    discordId: string,
    characterId: string,
  ): Promise<CharacterCard> {
    const character = await this.getOwnedCharacter(discordId, characterId);

    const characters = await this.getCharacters(discordId);

    return {
      character,
      hasMultiple: characters.length > 1,
    };
  }

  public static async getTransferSender(discordId: string, senderId: string) {
    const sender = await this.getOwnedCharacter(discordId, senderId);

    this.assertActive(sender.status, "Отправитель");

    return sender;
  }

  public static async getTransferReceivers(
    discordId: string,
    senderId: string,
    receiverDiscordId: string,
  ): Promise<TransferReceivers> {
    const sender = await this.getTransferSender(discordId, senderId);

    if (receiverDiscordId === discordId) {
      throw new EconomyError("Нельзя переводить деньги своим персонажам.");
    }

    const receiver = await UserRepository.getByDiscordId(receiverDiscordId);

    const characters = (receiver?.characters ?? [])
      .filter((character) => character.status === CharacterStatus.ALIVE)
      .map((character) => ({
        id: character.id,
        rpName: character.rpName,
      }));

    if (!characters.length) {
      throw new EconomyError("У выбранного игрока нет активных персонажей.");
    }

    return {
      sender,
      receiverDiscordId,
      characters,
    };
  }

  public static parseAmount(
    galleonsInput: string,
    sicklesInput: string,
    knutsInput: string,
  ) {
    const galleons = this.parseDenomination(galleonsInput, "Галлеоны");
    const sickles = this.parseDenomination(sicklesInput, "Сикли");
    const knuts = this.parseDenomination(knutsInput, "Кнаты");

    const amount = Currency.toKnuts(galleons, sickles, knuts);

    this.assertAmount(amount);

    return amount;
  }

  public static async previewTransfer(
    discordId: string,
    senderId: string,
    receiverId: string,
    amountKnuts: number,
  ): Promise<TransferPreview> {
    this.assertAmount(amountKnuts);

    const sender = await this.getTransferSender(discordId, senderId);

    const receiver = await EconomyRepository.getCharacter(receiverId);

    if (!receiver) {
      throw new EconomyError("Персонаж-получатель не найден.");
    }

    if (sender.id === receiver.id || sender.userId === receiver.userId) {
      throw new EconomyError("Нельзя переводить деньги своим персонажам.");
    }

    this.assertActive(receiver.status, "Получатель");

    if (!Currency.canAfford(sender.balanceKnuts, amountKnuts)) {
      throw new EconomyError(
        `Недостаточно средств. Доступно: ${Currency.short(sender.balanceKnuts)}.`,
      );
    }

    if (receiver.balanceKnuts + amountKnuts > MAX_BALANCE_KNUTS) {
      throw new EconomyError("Баланс получателя превысит допустимый предел.");
    }

    return {
      sender,
      receiver,
      amountKnuts,
    };
  }

  public static async transfer(
    discordId: string,
    senderId: string,
    receiverId: string,
    amountKnuts: number,
  ): Promise<TransferResult> {
    const preview = await this.previewTransfer(
      discordId,
      senderId,
      receiverId,
      amountKnuts,
    );

    const result = await EconomyRepository.transfer({
      senderId: preview.sender.id,
      receiverId: preview.receiver.id,
      amountKnuts,
      senderReason: `Перевод персонажу ${preview.receiver.rpName}`,
      receiverReason: `Перевод от персонажа ${preview.sender.rpName}`,
    });

    return {
      ...result,
      amountKnuts,
    };
  }

  public static async getHistory(
    discordId: string,
    characterId: string,
    page: number,
  ): Promise<HistoryPage> {
    const character = await this.getOwnedCharacter(discordId, characterId);

    const total = await TransactionRepository.count(character.id);

    const totalPages = Math.max(
      1,
      Math.ceil(total / this.HISTORY_PAGE_SIZE),
    );

    const safePage = Number.isInteger(page)
      ? Math.min(Math.max(page, 0), totalPages - 1)
      : 0;

    const transactions = await TransactionRepository.getHistory(
      character.id,
      safePage * this.HISTORY_PAGE_SIZE,
      this.HISTORY_PAGE_SIZE,
    );

    return {
      character,
      transactions,
      page: safePage,
      totalPages,
    };
  }

  private static parseDenomination(input: string, label: string) {
    const value = input.trim();

    if (!value.length) {
      return 0;
    }

    if (!/^\d+$/.test(value)) {
      throw new EconomyError(
        `Поле «${label}» должно содержать целое неотрицательное число.`,
      );
    }

    const amount = Number(value);

    if (!Number.isSafeInteger(amount) || amount > MAX_BALANCE_KNUTS) {
      throw new EconomyError(`Слишком большое значение в поле «${label}».`);
    }

    return amount;
  }

  private static assertAmount(amountKnuts: number) {
    if (!Number.isSafeInteger(amountKnuts) || amountKnuts <= 0) {
      throw new EconomyError("Сумма перевода должна быть больше нуля.");
    }

    if (amountKnuts > MAX_BALANCE_KNUTS) {
      throw new EconomyError("Слишком большая сумма перевода.");
    }
  }

  private static assertActive(status: CharacterStatus, role: string) {
    if (status === CharacterStatus.FROZEN) {
      throw new EconomyError(`${role}: персонаж заморожен.`);
    }

    if (status === CharacterStatus.DEAD) {
      throw new EconomyError(`${role}: персонаж мёртв.`);
    }
  }
}
