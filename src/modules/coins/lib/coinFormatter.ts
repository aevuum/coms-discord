import { CoinTransactionType } from "../../../database/generated/prisma/client.js";

export const COINS_EMOJI = "<:coms_coin:1562521767837306900>";

const transactionLabels: Record<CoinTransactionType, string> = {
  [CoinTransactionType.PURCHASE]: "Покупка",
  [CoinTransactionType.STIPEND]: "Еженедельное начисление",
  [CoinTransactionType.ADMIN_ADD]: "Начисление администрацией",
  [CoinTransactionType.ADMIN_REMOVE]: "Списание администрацией",
  [CoinTransactionType.AWARD_GRANT]: "Награда",
  [CoinTransactionType.AWARD_REVOKE]: "Снятие награды",
  [CoinTransactionType.ACTIVITY_REWARD]: "Награда за активность",
  [CoinTransactionType.EVENT_EXCHANGE]: "Обмен ивентовых предметов",
};

export class CoinFormatter {
  public static amount(value: number) {
    return `**${value.toLocaleString("ru-RU")}** ${COINS_EMOJI}`;
  }

  public static signed(value: number) {
    return `${value >= 0 ? "+" : "−"}${this.amount(Math.abs(value))}`;
  }

  public static transactionLabel(type: CoinTransactionType) {
    return transactionLabels[type] ?? "Операция";
  }
}
