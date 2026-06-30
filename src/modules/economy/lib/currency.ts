export const KNUTS_PER_SICKLE = 29;
export const SICKLES_PER_GALLEON = 17;
export const KNUTS_PER_GALLEON = KNUTS_PER_SICKLE * SICKLES_PER_GALLEON;

export type CurrencyBalance = {
  totalKnuts: number;
  galleons: number;
  sickles: number;
  knuts: number;
};

export class Currency {
  public static readonly START_BALANCE = 15 * 17 * 29 + 10 * 29 + 150;

  public static readonly INPUT_REGEX =
    /(\d+)\s*(г|галлеон(?:ов|а)?|галлеоны|g|с|сикл(?:ей|я)?|сикли|s|к|кнат(?:ов|а)?|кнаты|k)/gi;

  public static toKnuts(galleons: number, sickles = 0, knuts = 0): number {
    return galleons * KNUTS_PER_GALLEON + sickles * KNUTS_PER_SICKLE + knuts;
  }

  public static fromKnuts(totalKnuts: number): CurrencyBalance {
    const galleons = Math.floor(totalKnuts / KNUTS_PER_GALLEON);

    const afterGalleons = totalKnuts % KNUTS_PER_GALLEON;

    const sickles = Math.floor(afterGalleons / KNUTS_PER_SICKLE);

    const knuts = afterGalleons % KNUTS_PER_SICKLE;

    return {
      totalKnuts,
      galleons,
      sickles,
      knuts,
    };
  }

  public static format(totalKnuts: number): string {
    const balance = this.fromKnuts(totalKnuts);

    return [
      `<:galleon:1521547045268099242> Галлеоны: **${balance.galleons}**`,
      `<:sickle:1521547672304226304> Сикли: **${balance.sickles}**`,
      `<:knut:1521547458969342052> Кнаты: **${balance.knuts}**`,
    ].join("\n");
  }

  public static short(totalKnuts: number): string {
    const balance = this.fromKnuts(totalKnuts);

    return `${balance.galleons}г ${balance.sickles}с ${balance.knuts}к`;
  }

  public static parse(input: string): number {
    const text = input.trim().toLowerCase().replace(/,/g, ".");

    let total = 0;

    const matches = text.matchAll(this.INPUT_REGEX);

    for (const match of matches) {
      const value = Number(match[1]);

      const currency = match[2];

      if (
        currency.startsWith("г") ||
        currency.startsWith("gal") ||
        currency === "g"
      ) {
        total += value * KNUTS_PER_GALLEON;
        continue;
      }

      if (currency.startsWith("с") || currency === "s") {
        total += value * KNUTS_PER_SICKLE;
        continue;
      }

      total += value;
    }

    if (total <= 0) {
      throw new Error("Введите сумму. Например: 2г 5с 10к");
    }

    return total;
  }

  public static canAfford(balanceKnuts: number, amountKnuts: number): boolean {
    return balanceKnuts >= amountKnuts;
  }

  public static compare(left: number, right: number): number {
    if (left === right) {
      return 0;
    }

    return left > right ? 1 : -1;
  }

  public static add(balanceKnuts: number, amountKnuts: number): number {
    return balanceKnuts + amountKnuts;
  }

  public static subtract(balanceKnuts: number, amountKnuts: number): number {
    if (!this.canAfford(balanceKnuts, amountKnuts)) {
      throw new Error("Недостаточно средств.");
    }

    return balanceKnuts - amountKnuts;
  }

  public static isZero(knuts: number): boolean {
    return knuts === 0;
  }

  public static isNegative(knuts: number): boolean {
    return knuts < 0;
  }

  public static normalize(knuts: number): CurrencyBalance {
    return this.fromKnuts(knuts);
  }
}
