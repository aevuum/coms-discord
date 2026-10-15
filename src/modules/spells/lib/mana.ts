import type { Spell } from "../../../database/generated/prisma/client.js";

import type { ManaState } from "../types/spells.js";
import {
  BASE_SPELL_COST,
  DIFFICULTY_COEFFICIENTS,
  MANA_REGEN_PER_HOUR,
} from "./spellConfig.js";

const MS_PER_MANA = (60 * 60 * 1000) / MANA_REGEN_PER_HOUR;

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

  public static bar(mana: number, maxMana: number, size = 12) {
    const ratio = maxMana > 0 ? Math.min(Math.max(mana / maxMana, 0), 1) : 0;

    const filled = Math.round(ratio * size);

    return "▰".repeat(filled) + "▱".repeat(size - filled);
  }

  public static format(mana: number, maxMana: number) {
    return `\`${this.bar(mana, maxMana)}\` **${mana}** / ${maxMana}`;
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
