export enum CommandAccess {
  Public = "public",
  Restricted = "restricted",
  Admin = "admin",
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

export type CommandPermissionEntry = {
  name: string;
  description: string;
  access: CommandAccess;
  roleIds: string[];
};

declare module "@sapphire/framework" {
  interface CommandOptions {
    access?: CommandAccess;
  }
}
