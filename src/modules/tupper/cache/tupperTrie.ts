import type {
  Character,
  CharacterTupper,
  User,
} from "../../../database/generated/prisma/client.js";

export interface CachedTupper extends CharacterTupper {
  character: Character & {
    user: User;
  };
}

interface TrieNode {
  children: Map<string, TrieNode>;
  tupper?: CachedTupper;
}

export class TupperTrie {
  private readonly root: TrieNode = {
    children: new Map(),
  };

  public clear(): void {
    this.root.children.clear();
    delete this.root.tupper;
  }

  public insert(prefix: string, tupper: CachedTupper): void {
    let node = this.root;

    for (const char of prefix) {
      let child = node.children.get(char);

      if (!child) {
        child = {
          children: new Map(),
        };

        node.children.set(char, child);
      }

      node = child;
    }

    node.tupper = tupper;
  }

  public remove(prefix: string): void {
    const walk = (node: TrieNode, depth: number): boolean => {
      if (depth === prefix.length) {
        delete node.tupper;
      } else {
        const child = node.children.get(prefix[depth]);

        if (!child) {
          return false;
        }

        const shouldDelete = walk(child, depth + 1);

        if (shouldDelete) {
          node.children.delete(prefix[depth]);
        }
      }

      return node.children.size === 0 && node.tupper === undefined;
    };

    walk(this.root, 0);
  }

  public find(message: string) {
    let node = this.root;

    let matched: CachedTupper | undefined;
    let matchedLength = 0;

    for (let i = 0; i < message.length; i++) {
      const next = node.children.get(message[i]);

      if (!next) {
        break;
      }

      node = next;

      if (node.tupper) {
        matched = node.tupper;
        matchedLength = i + 1;
      }
    }

    if (!matched) {
      return null;
    }

    return {
      tupper: matched,
      content: message.slice(matchedLength).trimStart(),
    };
  }
}
