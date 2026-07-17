import type { CachedTupper } from "./tupperTrie.js";
import { TupperTrie } from "./tupperTrie.js";

export class TupperCache {
  private static readonly trie = new TupperTrie();

  public static clear(): void {
    this.trie.clear();
  }

  public static insert(tupper: CachedTupper): void {
    this.trie.insert(tupper.prefix, tupper);
  }

  public static remove(prefix: string): void {
    this.trie.remove(prefix);
  }

  public static find(message: string) {
    return this.trie.find(message.trimStart());
  }
}
