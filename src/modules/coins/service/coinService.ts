import type { BaseInteraction } from "discord.js";

import { CoinTransactionType } from "../../../database/generated/prisma/client.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { CoinRepository } from "../repositories/coinRepository.js";
import { CoinsError } from "../types/coins.js";

export class CoinService {
  public static readonly MANAGE_KEY = "manage.coins";

  public static readonly MAX_AMOUNT = 1_000_000;

  public static async assertCanManage(interaction: BaseInteraction) {
    const subject = await PermissionService.resolveSubject(interaction);

    if (
      !subject.guildId ||
      !(await PermissionService.canUse(subject, this.MANAGE_KEY))
    ) {
      throw new CoinsError("У вас нет доступа к управлению комс-коинами.");
    }

    return subject.guildId;
  }

  public static async getBalance(discordId: string) {
    return CoinRepository.getBalance(discordId);
  }

  public static async getHistory(discordId: string) {
    return CoinRepository.getHistory(discordId);
  }

  public static parseAmount(input: string) {
    const text = input.trim();

    if (!/^\d+$/.test(text)) {
      throw new CoinsError("Сумма должна быть целым положительным числом.");
    }

    const amount = Number(text);

    if (amount <= 0 || amount > this.MAX_AMOUNT) {
      throw new CoinsError(`Сумма должна быть от 1 до ${this.MAX_AMOUNT}.`);
    }

    return amount;
  }

  public static async adminAdjust(
    discordId: string,
    amountInput: string,
    reasonInput: string,
    remove: boolean,
  ) {
    const amount = this.parseAmount(amountInput);

    const reason = reasonInput.trim().slice(0, 200) || null;

    const balance = await CoinRepository.adjust(
      discordId,
      remove ? -amount : amount,
      remove ? CoinTransactionType.ADMIN_REMOVE : CoinTransactionType.ADMIN_ADD,
      reason,
    );

    if (balance === null) {
      throw new CoinsError("У игрока недостаточно комс-коинов для списания.");
    }

    return {
      amount,
      balance,
    };
  }
}
