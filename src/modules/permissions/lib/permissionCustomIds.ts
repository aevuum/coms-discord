export enum PermissionAction {
  Command = "command",
  Roles = "roles",
  Reset = "reset",
  Back = "back",
}

export class PermissionCustomIds {
  private static readonly PREFIX = "permissions";

  public static command() {
    return `${this.PREFIX}:${PermissionAction.Command}`;
  }

  public static roles(commandName: string) {
    return `${this.PREFIX}:${PermissionAction.Roles}:${commandName}`;
  }

  public static reset(commandName: string) {
    return `${this.PREFIX}:${PermissionAction.Reset}:${commandName}`;
  }

  public static back() {
    return `${this.PREFIX}:${PermissionAction.Back}`;
  }

  public static parse(customId: string) {
    const parts = customId.split(":");

    if (parts[0] !== this.PREFIX) return null;

    return {
      action: parts[1] as PermissionAction,
      args: parts.slice(2),
    };
  }
}
