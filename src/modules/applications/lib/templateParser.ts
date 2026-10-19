import type { ApplicationQuestion } from "../types/application.js";

const QUESTION = /^(\[[^\]]*\])?\s*(?:<a?:\w+:\d+>\s*)+(.+)$/;
const EMOJI = /<a?:\w+:\d+>/g;

export class TemplateParser {
  public static parse(text: string): ApplicationQuestion[] {
    const lines = text.split("\n").map((line) => line.trim());

    const questions: ApplicationQuestion[] = [];

    lines.forEach((line, index) => {
      if (!line || line.startsWith(">") || line.startsWith("#") || line.startsWith("-#")) {
        return;
      }

      const match = QUESTION.exec(line);
      const next = lines[index + 1] ?? "";

      if (!match || !next.startsWith(">")) {
        return;
      }

      const title = this.clean(match[2]);

      if (!title) {
        return;
      }

      questions.push({
        title: title.slice(0, 45),
        hint: this.clean(next.slice(1)) || null,
        optional: Boolean(match[1]),
      });
    });

    return questions;
  }

  public static split(text: string, limit: number) {
    const sentences = text
      .split(/(?<=[.!?])\s+(?=[А-ЯЁA-Z«"])/)
      .map((sentence) => sentence.trim())
      .filter(Boolean);

    const head: string[] = [];
    const tail: string[] = [];

    for (const sentence of sentences) {
      const target =
        head.length === 0 || (tail.length === 0 && [...head, sentence].join(" ").length <= limit)
          ? head
          : tail;

      target.push(sentence);
    }

    return {
      head: this.shorten(head.join(" ") || text, limit),
      tail: tail.length ? this.shorten(tail.join(" "), limit) : null,
    };
  }

  public static shorten(text: string, limit: number) {
    if (text.length <= limit) {
      return text;
    }

    const cut = text.slice(0, limit - 1);
    const space = cut.lastIndexOf(" ");

    return `${space > limit / 2 ? cut.slice(0, space) : cut}…`;
  }

  private static clean(text: string) {
    return text
      .replace(EMOJI, "")
      .replace(/[*_~`]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
}
