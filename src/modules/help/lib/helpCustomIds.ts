export enum HelpAction {
  Page = "page",
  Category = "category",
}

export class HelpCustomIds {
  private static readonly PREFIX = "help";

  public static page(index: number, mask: string) {
    return `${this.PREFIX}:${HelpAction.Page}:${index}:${mask}`;
  }

  public static category(mask: string) {
    return `${this.PREFIX}:${HelpAction.Category}:${mask}`;
  }

  public static parse(customId: string) {
    const parts = customId.split(":");

    if (parts[0] !== this.PREFIX) return null;

    return {
      action: parts[1] as HelpAction,
      args: parts.slice(2),
    };
  }
}
