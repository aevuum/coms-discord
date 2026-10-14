export const KNUTS_PER_SICKLE = 29;
export const SICKLES_PER_GALLEON = 17;
export const KNUTS_PER_GALLEON = KNUTS_PER_SICKLE * SICKLES_PER_GALLEON;
export const MAX_BALANCE_KNUTS = 2_147_483_647;

export type CurrencyBalance = {
  totalKnuts: number;
  galleons: number;
  sickles: number;
  knuts: number;
};

const GALLEON_EMOJI = "<:galleon:1521547045268099242>";
const SICKLE_EMOJI = "<:sickle:1521547672304226304>";
const KNUT_EMOJI = "<:knut:1521547458969342052>";

export class Currency {
  public static readonly START_BALANCE =
    15 * KNUTS_PER_GALLEON + 10 * KNUTS_PER_SICKLE + 150;

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
      `${GALLEON_EMOJI} Галлеоны: **${balance.galleons}**`,
      `${SICKLE_EMOJI} Сикли: **${balance.sickles}**`,
      `${KNUT_EMOJI} Кнаты: **${balance.knuts}**`,
    ].join("\n");
  }

  public static inline(totalKnuts: number): string {
    const balance = this.fromKnuts(totalKnuts);

    return `**${balance.galleons}** ${GALLEON_EMOJI} **${balance.sickles}** ${SICKLE_EMOJI} **${balance.knuts}** ${KNUT_EMOJI}`;
  }

  public static short(totalKnuts: number): string {
    const balance = this.fromKnuts(totalKnuts);

    return `${balance.galleons}г ${balance.sickles}с ${balance.knuts}к`;
  }

  public static canAfford(balanceKnuts: number, amountKnuts: number): boolean {
    return balanceKnuts >= amountKnuts;
  }
}
