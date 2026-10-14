import {
  CharacterTransaction,
  TransactionType,
} from "../../../database/generated/prisma/client.js";

import { Currency } from "./currency.js";

const transactionLabels: Record<TransactionType, string> = {
  [TransactionType.TRANSFER_IN]: "Входящий перевод",
  [TransactionType.TRANSFER_OUT]: "Исходящий перевод",
  [TransactionType.SALARY]: "Зарплата",
  [TransactionType.PURCHASE]: "Покупка",
  [TransactionType.FINE]: "Штраф",
  [TransactionType.ADMIN_ADD]: "Начисление администрацией",
  [TransactionType.ADMIN_REMOVE]: "Списание администрацией",
};

export class TransactionFormatter {
  public static label(type: TransactionType) {
    return transactionLabels[type] ?? "Операция";
  }

  public static entry(transaction: CharacterTransaction) {
    const sign = transaction.amountKnuts >= 0 ? "+" : "−";

    const timestamp = Math.floor(transaction.createdAt.getTime() / 1000);

    return [
      `**${this.label(transaction.type)}** · <t:${timestamp}:f>`,
      `${sign} ${Currency.inline(Math.abs(transaction.amountKnuts))}`,
      `-# Баланс после операции: ${Currency.short(transaction.balanceAfterKnuts)}${
        transaction.reason ? ` · ${transaction.reason}` : ""
      }`,
    ].join("\n");
  }
}
