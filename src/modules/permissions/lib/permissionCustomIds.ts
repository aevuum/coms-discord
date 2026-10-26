export enum PermissionAction {
  Overview = "overview",
  Target = "target",
  Roles = "roles",
  RolePage = "role_page",
  Reset = "reset",
}

export class PermissionCustomIds {
  private static readonly PREFIX = "permissions";

  public static overview() {
    return `${this.PREFIX}:${PermissionAction.Overview}`;
  }

  public static target(group: string) {
    return `${this.PREFIX}:${PermissionAction.Target}:${group}`;
  }

  public static roles(key: string, page: number) {
    return `${this.PREFIX}:${PermissionAction.Roles}:${key}:${page}`;
  }

  public static rolePage(key: string, page: number) {
    return `${this.PREFIX}:${PermissionAction.RolePage}:${key}:${page}`;
  }

  public static reset(key: string) {
    return `${this.PREFIX}:${PermissionAction.Reset}:${key}`;
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
