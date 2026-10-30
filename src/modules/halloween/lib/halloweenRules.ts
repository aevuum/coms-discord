import { HalloweenChoice, HalloweenError } from "../types/halloween.js";

const MAGIC = /(^|[^\p{L}])(маги|magic|колдов|чар)/iu;
const LIFE = /(^|[^\p{L}])(жизн|life|живот)/iu;

export class HalloweenRules {
  public static answer(text: string) {
    const normalized = text.toLowerCase().replace(/ё/g, "е");
    const magic = MAGIC.test(normalized);
    const life = LIFE.test(normalized);

    if (magic === life) {
      return null;
    }

    return magic ? HalloweenChoice.Magic : HalloweenChoice.Life;
  }

  public static range(input: string, label: string, min: number, max: number) {
    const match = /^\s*(\d+)\s*(?:[-–—]|до)?\s*(\d+)?\s*$/.exec(input);

    if (!match) {
      throw new HalloweenError(`${label}: укажите число или диапазон, например «${min}-${Math.min(max, min * 3)}».`);
    }

    const from = Number(match[1]);
    const to = match[2] ? Number(match[2]) : from;

    if (from < min || to > max || from > to) {
      throw new HalloweenError(`${label}: значения от ${min} до ${max}, первое не больше второго.`);
    }

    return [from, to] as const;
  }

  public static number(input: string, label: string, min: number, max: number) {
    const value = Number(input.trim());

    if (!Number.isInteger(value) || value < min || value > max) {
      throw new HalloweenError(`${label}: целое число от ${min} до ${max}.`);
    }

    return value;
  }

  public static between(min: number, max: number, rnd = Math.random) {
    return min + Math.floor(rnd() * (max - min + 1));
  }

  public static nextDrop(now: Date, minMinutes: number, maxMinutes: number, rnd = Math.random) {
    return new Date(now.getTime() + this.between(minMinutes, maxMinutes, rnd) * 60_000);
  }
}
