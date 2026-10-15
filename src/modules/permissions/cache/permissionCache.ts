export class PermissionCache {
  private static guilds = new Map<string, Map<string, string[]>>();

  public static get(guildId: string) {
    return this.guilds.get(guildId);
  }

  public static set(guildId: string, commands: Map<string, string[]>) {
    this.guilds.set(guildId, commands);
  }

  public static setCommand(
    guildId: string,
    commandName: string,
    roleIds: string[],
  ) {
    const commands = this.guilds.get(guildId);

    if (!commands) {
      return;
    }

    if (roleIds.length) {
      commands.set(commandName, roleIds);
    } else {
      commands.delete(commandName);
    }
  }

  public static clear() {
    this.guilds.clear();
  }
}
