import { CharacterFaculty } from "../../../database/generated/prisma/client.js";

import { POINTS_MAX_DELTA, type House, type PointsChange } from "../types/points.js";

const STEMS: [RegExp, House][] = [
  [/^(гриф|gryff)/, CharacterFaculty.GRYFFINDOR],
  [/^(слиз|slyth)/, CharacterFaculty.SLYTHERIN],
  [/^(когт|рейв|raven)/, CharacterFaculty.RAVENCLAW],
  [/^(пуф|хаф|huff)/, CharacterFaculty.HUFFLEPUFF],
];

const PATTERN =
  /(^|[^\p{L}\p{N}+\-−–])([+\-−–])\s?(\d{1,4})\s*(?:очк[а-яё]*\s+|балл[а-яё]*\s+|points?\s+)?(?:факультет[а-яё]*\s+|house\s+)?([\p{L}]+)/giu;

export class PointsParser {
  public static parse(text: string): PointsChange[] {
    const totals = new Map<House, number>();
    const clean = text.replace(/[*_~`|]/g, "");

    for (const match of clean.matchAll(PATTERN)) {
      const [, , sign, digits, word] = match;
      const faculty = this.house(word);

      if (!faculty) {
        continue;
      }

      const amount = Number(digits);

      if (!amount || amount > POINTS_MAX_DELTA) {
        continue;
      }

      totals.set(faculty, (totals.get(faculty) ?? 0) + (sign === "+" ? amount : -amount));
    }

    return [...totals.entries()]
      .filter(([, delta]) => delta !== 0)
      .map(([faculty, delta]) => ({ faculty, delta }));
  }

  public static house(word: string): House | null {
    const normalized = word.toLowerCase().replace(/ё/g, "е");

    return STEMS.find(([stem]) => stem.test(normalized))?.[1] ?? null;
  }
}
