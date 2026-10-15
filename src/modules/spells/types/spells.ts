import type {
  Spell,
  SpellDifficulty,
} from "../../../database/generated/prisma/client.js";

export class SpellError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SpellError";
  }
}

export type SpellSeed = {
  name: string;
  incantations: string[];
  difficulty: SpellDifficulty;
  description: string;
  gifQuery: string;
};

export type SpellInput = {
  name: string;
  incantations: string;
  difficulty: string;
  manaCost: string;
  imageUrl: string;
};

export type ManaState = {
  mana: number;
  maxMana: number;
  manaUpdatedAt: Date;
};

export type CastedSpell = {
  spell: Spell;
  manaCost: number;
  imageUrl: string | null;
};

export type CastResult = {
  characterName: string;
  spells: CastedSpell[];
  totalCost: number;
  manaAfter: number;
  maxMana: number;
};

export type SpellPage = {
  spells: Spell[];
  page: number;
  totalPages: number;
  total: number;
};

export enum SpellMode {
  View = "v",
  Manage = "m",
}
