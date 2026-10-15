import type { Spell } from "../../../database/generated/prisma/client.js";

type MatchEntry = {
  phrase: string;
  spell: Spell;
};

export class SpellMatcher {
  private entries: MatchEntry[] = [];

  public static normalize(text: string) {
    return text
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  public static extractEmphasis(text: string) {
    return [...text.matchAll(/\*\*(.+?)\*\*/gs)]
      .map((match) => match[1])
      .filter((segment) => segment.trim().length > 0);
  }

  public matchEmphasis(text: string, limit = 5): Spell[] {
    const found: Spell[] = [];

    for (const segment of SpellMatcher.extractEmphasis(text)) {
      for (const spell of this.match(segment, limit)) {
        if (!found.some((item) => item.id === spell.id)) {
          found.push(spell);
        }
      }

      if (found.length >= limit) {
        return found.slice(0, limit);
      }
    }

    return found;
  }

  public load(spells: Spell[]) {
    this.entries = spells
      .flatMap((spell) =>
        spell.incantations
          .map((incantation) => SpellMatcher.normalize(incantation))
          .filter((phrase) => phrase.length > 0)
          .map((phrase) => ({ phrase, spell })),
      )
      .sort((left, right) => right.phrase.length - left.phrase.length);
  }

  public match(text: string, limit = 5): Spell[] {
    let haystack = ` ${SpellMatcher.normalize(text)} `;

    const found: Spell[] = [];

    for (const entry of this.entries) {
      const needle = ` ${entry.phrase} `;

      if (!haystack.includes(needle)) {
        continue;
      }

      haystack = haystack.split(needle).join(" | ");

      if (!found.some((spell) => spell.id === entry.spell.id)) {
        found.push(entry.spell);
      }

      if (found.length >= limit) {
        break;
      }
    }

    return found;
  }
}
