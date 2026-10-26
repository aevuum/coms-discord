const EN = "`qwertyuiop[]asdfghjkl;'zxcvbnm,.";
const RU = "ёйцукенгшщзхъфывапролджэячсмитьбю";

const LAYOUT = new Map<string, string>([...EN].map((char, index) => [char, RU[index]]));

export type SearchHit<T> = {
  item: T;
  score: number;
  matched: string;
  exact: boolean;
};

export type Searchable = {
  name: string;
  incantations: string[];
};

const MIN_SCORE = 0.55;

export class SpellSearch {
  public static normalize(text: string) {
    return text
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  public static fromLatinLayout(text: string) {
    return [...text.toLowerCase()].map((char) => LAYOUT.get(char) ?? char).join("");
  }

  public static distance(left: string, right: string) {
    const rows = left.length + 1;
    const cols = right.length + 1;
    const d: number[][] = Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));

    for (let i = 1; i < rows; i++) {
      for (let j = 1; j < cols; j++) {
        const cost = left[i - 1] === right[j - 1] ? 0 : 1;

        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);

        if (i > 1 && j > 1 && left[i - 1] === right[j - 2] && left[i - 2] === right[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
    }

    return d[rows - 1][cols - 1];
  }

  public static similarity(left: string, right: string) {
    if (!left.length || !right.length) {
      return 0;
    }

    return 1 - this.distance(left, right) / Math.max(left.length, right.length);
  }

  public static score(query: string, candidate: string) {
    if (!query || !candidate) {
      return 0;
    }

    if (candidate === query) {
      return 1;
    }

    if (candidate.startsWith(query)) {
      return 0.95;
    }

    if (candidate.includes(query)) {
      return 0.9;
    }

    const words = candidate.split(" ");
    const parts = query.split(" ");

    const wordScores = parts.map((part) =>
      Math.max(
        ...words.map((word) => {
          if (part.length >= 2 && word.startsWith(part)) {
            return 0.92;
          }

          const prefix = word.slice(0, Math.max(part.length, 3));

          return Math.max(this.similarity(part, word), this.similarity(part, prefix) - 0.06);
        }),
      ),
    );

    const byWords = wordScores.reduce((sum, value) => sum + value, 0) / wordScores.length;

    return Math.max(this.similarity(query, candidate), byWords * 0.94);
  }

  public static find<T extends Searchable>(items: T[], input: string, limit = 10): SearchHit<T>[] {
    const query = this.normalize(input);

    if (!query) {
      return [];
    }

    const variants = [...new Set([query, this.normalize(this.fromLatinLayout(input))])];

    return items
      .map((item) => {
        let best = { score: 0, matched: item.name };

        for (const text of [item.name, ...item.incantations]) {
          const candidate = this.normalize(text);

          for (const variant of variants) {
            const value = this.score(variant, candidate) - (variant === query ? 0 : 0.03);

            if (value > best.score) {
              best = { score: value, matched: text };
            }
          }
        }

        return { item, score: best.score, matched: best.matched, exact: best.score >= 0.9 };
      })
      .filter((hit) => hit.score >= MIN_SCORE)
      .sort((left, right) => right.score - left.score || left.item.name.localeCompare(right.item.name, "ru"))
      .slice(0, limit);
  }
}
