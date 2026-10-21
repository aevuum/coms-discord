import { SpellDifficulty } from "../../../database/generated/prisma/client.js";

export const MANA_REGEN_PER_HOUR = 10;

export const BASE_SPELL_COST = 10;

export const MAX_SPELL_COST = 1000;

export const GIF_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const DIFFICULTY_COEFFICIENTS: Record<SpellDifficulty, number> = {
  [SpellDifficulty.BASIC]: 1,
  [SpellDifficulty.INTERMEDIATE]: 1.5,
  [SpellDifficulty.ADVANCED]: 2.5,
  [SpellDifficulty.MASTER]: 4,
  [SpellDifficulty.UNFORGIVABLE]: 6,
};

export const DIFFICULTY_STARS: Record<SpellDifficulty, number> = {
  [SpellDifficulty.BASIC]: 1,
  [SpellDifficulty.INTERMEDIATE]: 2,
  [SpellDifficulty.ADVANCED]: 3,
  [SpellDifficulty.MASTER]: 4,
  [SpellDifficulty.UNFORGIVABLE]: 5,
};

export const DIFFICULTY_LABELS: Record<SpellDifficulty, string> = {
  [SpellDifficulty.BASIC]: "Простое",
  [SpellDifficulty.INTERMEDIATE]: "Среднее",
  [SpellDifficulty.ADVANCED]: "Сложное",
  [SpellDifficulty.MASTER]: "Высшая магия",
  [SpellDifficulty.UNFORGIVABLE]: "Непростительное",
};


export const DIFFICULTY_ORDER: SpellDifficulty[] = [
  SpellDifficulty.BASIC,
  SpellDifficulty.INTERMEDIATE,
  SpellDifficulty.ADVANCED,
  SpellDifficulty.MASTER,
  SpellDifficulty.UNFORGIVABLE,
];
