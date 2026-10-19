import { GiveawayError } from "../types/giveaway.js";

const UNITS: [RegExp, number][] = [
  [/^(н|нед|w)/, 7 * 24 * 60],
  [/^(д|d)/, 24 * 60],
  [/^(ч|h)/, 60],
  [/^(м|m)/, 1],
];

export const GIVEAWAY_MAX_MINUTES = 60 * 24 * 60;

export class GiveawayDuration {
  public static parse(input: string) {
    const text = input.toLowerCase().trim();
    const tokens = [...text.matchAll(/(\d+)\s*([a-zа-яё]*)/g)];

    if (!tokens.length || text.replace(/(\d+)\s*([a-zа-яё]*)/g, "").replace(/[\s.,]/g, "")) {
      throw new GiveawayError("Не понял длительность. Примеры: «30м», «2ч», «1д 12ч», «1нед».");
    }

    let minutes = 0;

    for (const [, amount, unit] of tokens) {
      const multiplier = unit ? UNITS.find(([pattern]) => pattern.test(unit))?.[1] : 1;

      if (!multiplier) {
        throw new GiveawayError(`Неизвестная единица времени «${unit}». Используйте м, ч, д или нед.`);
      }

      minutes += Number(amount) * multiplier;
    }

    if (minutes < 1) {
      throw new GiveawayError("Розыгрыш должен длиться хотя бы минуту.");
    }

    if (minutes > GIVEAWAY_MAX_MINUTES) {
      throw new GiveawayError("Розыгрыш не может длиться дольше 60 дней.");
    }

    return minutes;
  }

  public static format(minutes: number) {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const rest = minutes % 60;

    return (
      [days ? `${days} д` : null, hours ? `${hours} ч` : null, rest ? `${rest} мин` : null]
        .filter(Boolean)
        .join(" ") || "0 мин"
    );
  }
}
