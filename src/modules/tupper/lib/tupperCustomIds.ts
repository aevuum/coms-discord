export enum TupperAction {
  Select = "select",
  Back = "back",
  Name = "name",
  Prefix = "prefix",
  NameModal = "name_modal",
  PrefixModal = "prefix_modal",
}

export const TupperModalFields = {
  Name: "name",
  Prefix: "prefix",
} as const;

export class TupperCustomIds {
  private static readonly PREFIX = "tupper";

  public static select() {
    return `${this.PREFIX}:${TupperAction.Select}`;
  }

  public static back() {
    return `${this.PREFIX}:${TupperAction.Back}`;
  }

  public static name(characterId: string) {
    return `${this.PREFIX}:${TupperAction.Name}:${characterId}`;
  }

  public static prefix(characterId: string) {
    return `${this.PREFIX}:${TupperAction.Prefix}:${characterId}`;
  }

  public static nameModal(characterId: string) {
    return `${this.PREFIX}:${TupperAction.NameModal}:${characterId}`;
  }

  public static prefixModal(characterId: string) {
    return `${this.PREFIX}:${TupperAction.PrefixModal}:${characterId}`;
  }

  public static parse(customId: string) {
    const parts = customId.split(":");

    if (parts[0] !== this.PREFIX) return null;

    return {
      action: parts[1] as TupperAction,
      args: parts.slice(2),
    };
  }
}
