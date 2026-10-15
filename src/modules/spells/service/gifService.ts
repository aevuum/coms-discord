import { container } from "@sapphire/framework";

type GiphyGif = {
  title?: string;
  slug?: string;
  images?: {
    downsized_medium?: { url?: string };
    original?: { url?: string };
  };
};

type GiphyResponse = {
  data?: GiphyGif[];
};

export class GifService {
  private static readonly ENDPOINT = "https://api.giphy.com/v1/gifs/search";

  private static readonly TIMEOUT_MS = 5000;

  private static readonly SEARCH_LIMIT = 50;

  private static readonly RESULT_LIMIT = 10;

  private static readonly FRANCHISE = "harry potter";

  private static readonly FALLBACK_QUERY = "harry potter spell wand";

  private static readonly RELEVANT =
    /potter|hogwarts|wizard|witch|magic|spell|wand|hermione|dumbledore|voldemort|snape|weasley|fantastic beasts/i;

  public static isEnabled() {
    return Boolean(process.env.GIPHY_API_KEY);
  }

  public static async search(spellQuery: string): Promise<string[]> {
    if (!this.isEnabled()) {
      return [];
    }

    const base = spellQuery
      .toLowerCase()
      .replace(/harry potter/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const words = base.split(" ").filter((word) => word.length > 2);

    const results = base
      ? await this.request(`${base} ${this.FRANCHISE}`)
      : [];

    const relevant = results.filter((gif) => this.isRelevant(gif));

    const exact = relevant.filter((gif) => this.mentions(gif, words));

    const chosen = exact.length
      ? exact
      : relevant.length
        ? relevant
        : (await this.request(this.FALLBACK_QUERY)).filter((gif) =>
            this.isRelevant(gif),
          );

    return chosen
      .map((gif) => gif.images?.downsized_medium?.url ?? gif.images?.original?.url)
      .filter((gifUrl): gifUrl is string => Boolean(gifUrl))
      .slice(0, this.RESULT_LIMIT);
  }

  private static isRelevant(gif: GiphyGif) {
    return this.RELEVANT.test(`${gif.title ?? ""} ${gif.slug ?? ""}`);
  }

  private static mentions(gif: GiphyGif, words: string[]) {
    if (!words.length) {
      return false;
    }

    const text = `${gif.title ?? ""} ${gif.slug ?? ""}`
      .toLowerCase()
      .replace(/[-_]/g, " ");

    return words.every((word) => new RegExp(`\\b${word}\\b`).test(text));
  }

  private static async request(query: string): Promise<GiphyGif[]> {
    const url = new URL(this.ENDPOINT);

    url.searchParams.set("api_key", process.env.GIPHY_API_KEY ?? "");
    url.searchParams.set("q", query);
    url.searchParams.set("limit", String(this.SEARCH_LIMIT));
    url.searchParams.set("rating", "pg-13");
    url.searchParams.set("lang", "en");

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.TIMEOUT_MS),
      });

      if (!response.ok) {
        container.logger.warn(
          `Giphy search failed with status ${response.status}`,
        );
        return [];
      }

      const body = (await response.json()) as GiphyResponse;

      return body.data ?? [];
    } catch (error) {
      container.logger.warn(`Giphy search failed: ${String(error)}`);
      return [];
    }
  }
}
