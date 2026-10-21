import type { Spell } from "../../../database/generated/prisma/client.js";

import type { ManaState } from "../types/spells.js";
import {
  BASE_SPELL_COST,
  DIFFICULTY_COEFFICIENTS,
  MANA_REGEN_PER_HOUR,
} from "./spellConfig.js";

const MS_PER_MANA = (60 * 60 * 1000) / MANA_REGEN_PER_HOUR;

const CRITICAL_LIFE_RATIO = 0.5;

type BarSegments = Record<"left" | "middle" | "right", [string, string, string]>;

const MANA_BAR: BarSegments = {
  left: [
    "<:mana_l_empty:1562485510054617108>",
    "<:mana_l_half:1562485514114965504>",
    "<:mana_l_full:1562485511942180925>",
  ],
  middle: [
    "<:mana_m_empty:1562485516622897252>",
    "<:mana_m_half:1562485521068851210>",
    "<:mana_m_full:1562485518976028734>",
  ],
  right: [
    "<:mana_r_empty:1562485522956288160>",
    "<:mana_r_half:1562485527167373354>",
    "<:mana_r_full:1562485524873085098>",
  ],
};

const LIFE_BAR: BarSegments = {
  left: [
    "<:life_l_empty:1562485488416325692>",
    "<:life_l_half:1562485492933599313>",
    "<:life_l_full:1562485490832375858>",
  ],
  middle: [
    "<:life_m_empty:1562485495299047444>",
    "<:life_m_half:1562485500147933294>",
    "<:life_m_full:1562485497526358176>",
  ],
  right: [
    "<:life_r_empty:1562485502052143154>",
    "<:life_r_half:1562485507504603228>",
    "<:life_r_full:1562485505038221312>",
  ],
};

export class Mana {
  public static spellCost(spell: Pick<Spell, "difficulty" | "manaCost">) {
    if (spell.manaCost !== null && spell.manaCost !== undefined) {
      return spell.manaCost;
    }

    return Math.round(BASE_SPELL_COST * DIFFICULTY_COEFFICIENTS[spell.difficulty]);
  }

  public static regenerate(state: ManaState, now = new Date()): ManaState {
    if (state.mana >= state.maxMana) {
      return {
        mana: state.mana,
        maxMana: state.maxMana,
        manaUpdatedAt: now,
      };
    }

    const elapsed = Math.max(0, now.getTime() - state.manaUpdatedAt.getTime());

    const gained = Math.floor(elapsed / MS_PER_MANA);

    if (state.mana + gained >= state.maxMana) {
      return {
        mana: state.maxMana,
        maxMana: state.maxMana,
        manaUpdatedAt: now,
      };
    }

    return {
      mana: state.mana + gained,
      maxMana: state.maxMana,
      manaUpdatedAt: new Date(state.manaUpdatedAt.getTime() + gained * MS_PER_MANA),
    };
  }

  public static current(state: ManaState, now = new Date()) {
    return this.regenerate(state, now).mana;
  }

  public static bar(mana: number, maxMana: number, size = 10) {
    const segments = mana < 0 ? LIFE_BAR : MANA_BAR;

    const ratio = maxMana > 0 ? Math.min(Math.abs(mana) / maxMana, 1) : 0;

    const halves = mana === 0 ? 0 : Math.max(Math.round(ratio * size * 2), 1);

    return Array.from({ length: size }, (_, index) => {
      const part = index === 0 ? "left" : index === size - 1 ? "right" : "middle";
      const fill = Math.min(Math.max(halves - index * 2, 0), 2);

      return segments[part][fill];
    }).join("");
  }

  public static format(mana: number, maxMana: number) {
    return `${this.bar(mana, maxMana)} **${mana}** / ${maxMana}`;
  }

  public static status(mana: number, maxMana: number) {
    if (mana >= maxMana) {
      return "Мана полностью восстановлена";
    }

    if (mana > 0) {
      return "Мана восстанавливается";
    }

    if (mana === 0) {
      return "Мана иссякла";
    }

    return Math.abs(mana) / Math.max(maxMana, 1) < CRITICAL_LIFE_RATIO
      ? "Опасно: тратятся жизненные силы"
      : "Критично: жизненные силы на исходе";
  }

  public static timeToFull(mana: number, maxMana: number) {
    if (mana >= maxMana) {
      return null;
    }

    const totalMinutes = Math.ceil(((maxMana - mana) * MS_PER_MANA) / 60000);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (!hours) {
      return `${minutes} мин`;
    }

    return minutes ? `${hours} ч ${minutes} мин` : `${hours} ч`;
  }
}
