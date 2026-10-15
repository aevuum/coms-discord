export enum CommandAccess {
  Public = "public",
  Restricted = "restricted",
  Admin = "admin",
  Delegated = "delegated",
}

export class PermissionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

export type AccessSubject = {
  guildId: string | null;
  member: unknown;
  memberPermissions: { has(permission: bigint): boolean } | null;
};

export type PermissionTarget = {
  key: string;
  label: string;
  description: string;
  access: CommandAccess;
};

export type PermissionTargetEntry = PermissionTarget & {
  roleIds: string[];
};

export type GuildRoleOption = {
  id: string;
  name: string;
};

export type RolePage = {
  roles: GuildRoleOption[];
  page: number;
  totalPages: number;
};

declare module "@sapphire/framework" {
  interface CommandOptions {
    access?: CommandAccess;
  }
}
