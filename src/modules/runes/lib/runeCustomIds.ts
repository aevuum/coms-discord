export enum RuneAction {
  Pick = "pick",
  Page = "page",
  Back = "back",
}

export class RuneCustomIds {
  private static readonly PREFIX = "rune";

  public static build(action: RuneAction, ...args: string[]) {
    return [this.PREFIX, action, ...args].join(":");
  }

  public static parse(customId: string) {
    const parts = customId.split(":");

    if (parts[0] !== this.PREFIX) return null;

    return {
      action: parts[1] as RuneAction,
      args: parts.slice(2),
    };
  }
}
