const BREAKS = [/\n\s*\n/g, /\n/g, /[.!?…»)](?=\s)/g, /\s/g];

export class MessageSplitter {
  public static split(text: string, limit: number) {
    const chunks: string[] = [];
    let rest = text.trim();

    while (rest.length > limit) {
      const cut = this.findCut(rest, limit);

      chunks.push(rest.slice(0, cut).trimEnd());
      rest = rest.slice(cut).trimStart();
    }

    if (rest.length) {
      chunks.push(rest);
    }

    return chunks;
  }

  private static findCut(text: string, limit: number) {
    const window = text.slice(0, limit + 1);
    const minimum = Math.floor(limit / 2);

    for (const pattern of BREAKS) {
      let best = -1;

      for (const match of window.matchAll(pattern)) {
        const end = match.index + match[0].length;

        if (end <= limit && !this.insideEmoji(text, end)) {
          best = end;
        }
      }

      if (best >= minimum) {
        return best;
      }
    }

    let cut = limit;

    while (cut > minimum && this.insideEmoji(text, cut)) {
      cut--;
    }

    return cut;
  }

  private static insideEmoji(text: string, position: number) {
    const open = text.lastIndexOf("<", position - 1);

    if (open === -1) {
      return false;
    }

    const close = text.indexOf(">", open);

    return close >= position && /^<a?:\w{2,32}:\d{0,20}$/.test(text.slice(open, position));
  }
}
