export enum ManageAction {
  Home = "home",
  Section = "section",
}

export const MEMBER_QUERY_FIELD = "member_query";

export class ManageCustomIds {
  private static readonly PREFIX = "manage";

  public static home() {
    return `${this.PREFIX}:${ManageAction.Home}`;
  }

  public static section() {
    return `${this.PREFIX}:${ManageAction.Section}`;
  }

  public static parse(customId: string) {
    const parts = customId.split(":");

    if (parts[0] !== this.PREFIX) return null;

    return {
      action: parts[1] as ManageAction,
      args: parts.slice(2),
    };
  }
}
