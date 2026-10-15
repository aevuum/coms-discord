import type { Spell } from "../../../database/generated/prisma/client.js";

import { SpellMatcher } from "../lib/spellMatcher.js";

export class SpellCache {
  private static readonly matcher = new SpellMatcher();

  private static spells: Spell[] = [];

  private static loaded = false;

  public static isLoaded() {
    return this.loaded;
  }

  public static set(spells: Spell[]) {
    this.spells = spells;
    this.matcher.load(spells);
    this.loaded = true;
  }

  public static all() {
    return this.spells;
  }

  public static match(text: string) {
    return this.matcher.matchEmphasis(text);
  }

  public static update(spell: Spell) {
    this.set([...this.spells.filter((item) => item.id !== spell.id), spell]);
  }

  public static remove(spellId: string) {
    this.set(this.spells.filter((item) => item.id !== spellId));
  }
}
