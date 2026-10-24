import { randomInt } from "node:crypto";

import {
  RuneFuthark,
  RuneOutcome,
  type Rune,
  type RuneSettings,
} from "../../../database/generated/prisma/client.js";

import { RUNE_MAX_MASTERY } from "./runeCatalog.js";

export type MasteryEntry = {
  mastery: number;
  critical: boolean;
};

export type RiskInput = {
  baseRisk: number;
  complexity: number;
  mastery: number;
};

export type CapacityInput = {
  baseCapacity: number;
  qualityPercent: number;
  bonuses: { capacityBonus: number; quantity: number }[];
};

export const OUTCOME_LABELS: Record<RuneOutcome, string> = {
  [RuneOutcome.REFUSE]: "Отказ: попытка не начинается, материалы целы",
  [RuneOutcome.FIZZLE]: "Осечка: заклинание рассеивается без эффекта",
  [RuneOutcome.BACKFIRE]: "Отдача: эффект бьёт по самому заклинателю",
  [RuneOutcome.INJURY]: "Травма заклинателя",
  [RuneOutcome.MATERIALS_LOST]: "Материалы потрачены, предмет не создан",
  [RuneOutcome.DAMAGED]: "Предмет создан повреждённым",
  [RuneOutcome.UNSTABLE]: "Руны нестабильны: предмет работает непредсказуемо",
  [RuneOutcome.DESTROYED]: "Заготовка разрушена",
};

export const FORMULA_OUTCOMES: RuneOutcome[] = [
  RuneOutcome.FIZZLE,
  RuneOutcome.BACKFIRE,
  RuneOutcome.INJURY,
  RuneOutcome.UNSTABLE,
];

export const ARTIFACT_FAILURE_OUTCOMES: RuneOutcome[] = [
  RuneOutcome.MATERIALS_LOST,
  RuneOutcome.DAMAGED,
  RuneOutcome.UNSTABLE,
  RuneOutcome.DESTROYED,
];

export const ARTIFACT_OVERLOAD_OUTCOMES: RuneOutcome[] = [
  RuneOutcome.REFUSE,
  RuneOutcome.DAMAGED,
  RuneOutcome.UNSTABLE,
  RuneOutcome.DESTROYED,
];

export class RuneRules {
  public static clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  public static parseMastery(input: string) {
    const text = input.trim();

    if (!/^\d+$/.test(text) || Number(text) > RUNE_MAX_MASTERY) {
      return null;
    }

    return Number(text);
  }

  public static runeLoad(rune: Pick<Rune, "load" | "futhark">, settings: RuneSettings) {
    if (rune.load !== null) {
      return rune.load;
    }

    return rune.futhark === RuneFuthark.ELDER ? settings.elderLoad : settings.youngerLoad;
  }

  public static totalLoad(runes: Pick<Rune, "load" | "futhark">[], settings: RuneSettings) {
    return runes.reduce((sum, rune) => sum + this.runeLoad(rune, settings), 0);
  }

  public static capacity(input: CapacityInput) {
    const raw =
      input.baseCapacity +
      input.bonuses.reduce((sum, entry) => sum + entry.capacityBonus * entry.quantity, 0);

    return Math.max(Math.floor((raw * input.qualityPercent) / 100), 0);
  }

  public static decisiveMastery(entries: MasteryEntry[]) {
    if (!entries.length) {
      return 0;
    }

    const critical = entries.filter((entry) => entry.critical);
    const pool = critical.length ? critical : entries;

    return Math.min(...pool.map((entry) => entry.mastery));
  }

  public static masteryReduction(mastery: number, settings: RuneSettings) {
    return Math.round((this.clamp(mastery, 0, RUNE_MAX_MASTERY) * settings.masteryReductionPct) / 100);
  }

  public static risk(input: RiskInput, settings: RuneSettings) {
    const value = input.baseRisk + input.complexity - this.masteryReduction(input.mastery, settings);

    return this.clamp(Math.round(value), settings.minRisk, settings.maxRisk);
  }

  public static roll() {
    return randomInt(1, 101);
  }

  public static succeeded(roll: number, risk: number) {
    return roll > risk;
  }

  public static quality(roll: number, risk: number, mastery: number) {
    const margin = (roll - risk) / Math.max(100 - risk, 1);

    return this.clamp(Math.round(margin * 50 + mastery / 2), 1, 100);
  }
}
