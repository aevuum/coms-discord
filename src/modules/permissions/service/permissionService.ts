import { container, type ChatInputCommand } from "@sapphire/framework";

import { PermissionFlagsBits } from "discord.js";

import { PermissionCache } from "../cache/permissionCache.js";
import { PermissionRepository } from "../repositories/permissionRepository.js";
import {
  CommandAccess,
  PermissionError,
  type AccessSubject,
  type CommandPermissionEntry,
} from "../types/permissions.js";

export class PermissionService {
  public static readonly MAX_ROLES = 25;

  public static isAdmin(subject: AccessSubject) {
    return (
      subject.memberPermissions?.has(PermissionFlagsBits.Administrator) ??
      false
    );
  }

  public static getAccess(command: ChatInputCommand) {
    return command.options.access ?? CommandAccess.Public;
  }

  public static async canUse(subject: AccessSubject, commandName: string) {
    const command = this.getCommand(commandName);

    if (!command) {
      return false;
    }

    if (this.isAdmin(subject)) {
      return true;
    }

    const access = this.getAccess(command);

    if (access === CommandAccess.Admin) {
      return false;
    }

    if (!subject.guildId) {
      return access === CommandAccess.Public;
    }

    const roleIds = await this.getRoles(subject.guildId, command.name);

    if (!roleIds.length) {
      return access === CommandAccess.Public;
    }

    const memberRoles = this.getMemberRoleIds(subject.member);

    return roleIds.some(
      (roleId) => roleId === subject.guildId || memberRoles.includes(roleId),
    );
  }

  public static async listCommands(
    guildId: string,
  ): Promise<CommandPermissionEntry[]> {
    const permissions = await this.loadGuild(guildId);

    return this.getConfigurableCommands().map((command) => ({
      name: command.name,
      description: command.description,
      access: this.getAccess(command),
      roleIds: permissions.get(command.name) ?? [],
    }));
  }

  public static async getCommandEntry(
    guildId: string,
    commandName: string,
  ): Promise<CommandPermissionEntry> {
    const command = this.getConfigurableCommand(commandName);

    return {
      name: command.name,
      description: command.description,
      access: this.getAccess(command),
      roleIds: await this.getRoles(guildId, command.name),
    };
  }

  public static async setRoles(
    subject: AccessSubject,
    commandName: string,
    roleIds: string[],
  ) {
    this.assertAdmin(subject);

    const command = this.getConfigurableCommand(commandName);

    const unique = [...new Set(roleIds)].filter((roleId) =>
      /^\d{17,20}$/.test(roleId),
    );

    if (unique.length > this.MAX_ROLES) {
      throw new PermissionError(
        `Можно назначить не больше ${this.MAX_ROLES} ролей.`,
      );
    }

    const guildId = subject.guildId as string;

    await this.loadGuild(guildId);

    await PermissionRepository.setRoles(guildId, command.name, unique);

    PermissionCache.setCommand(guildId, command.name, unique);

    return this.getCommandEntry(guildId, command.name);
  }

  public static assertAdmin(subject: AccessSubject) {
    if (!subject.guildId) {
      throw new PermissionError("Эта команда доступна только на сервере.");
    }

    if (!this.isAdmin(subject)) {
      throw new PermissionError(
        "Настраивать доступ могут только администраторы сервера.",
      );
    }
  }

  private static async getRoles(guildId: string, commandName: string) {
    const permissions = await this.loadGuild(guildId);

    return permissions.get(commandName) ?? [];
  }

  private static async loadGuild(guildId: string) {
    const cached = PermissionCache.get(guildId);

    if (cached) {
      return cached;
    }

    const rows = await PermissionRepository.getGuildPermissions(guildId);

    const permissions = new Map<string, string[]>();

    for (const row of rows) {
      permissions.set(row.commandName, [
        ...(permissions.get(row.commandName) ?? []),
        row.roleId,
      ]);
    }

    PermissionCache.set(guildId, permissions);

    return permissions;
  }

  private static getMemberRoleIds(member: unknown): string[] {
    if (!member || typeof member !== "object" || !("roles" in member)) {
      return [];
    }

    const roles = (member as { roles: unknown }).roles;

    if (Array.isArray(roles)) {
      return roles.filter((role): role is string => typeof role === "string");
    }

    if (roles && typeof roles === "object" && "cache" in roles) {
      return [...(roles as { cache: Map<string, unknown> }).cache.keys()];
    }

    return [];
  }

  private static getCommand(commandName: string) {
    const command = container.stores.get("commands").get(commandName);

    return command?.supportsChatInputCommands() ? command : null;
  }

  private static getConfigurableCommands(): ChatInputCommand[] {
    return [...container.stores.get("commands").values()]
      .filter(
        (command): command is ChatInputCommand =>
          command.supportsChatInputCommands() &&
          this.getAccess(command as ChatInputCommand) !== CommandAccess.Admin,
      )
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  private static getConfigurableCommand(commandName: string) {
    const command = this.getCommand(commandName);

    if (!command || this.getAccess(command) === CommandAccess.Admin) {
      throw new PermissionError("Эту команду нельзя настроить.");
    }

    return command;
  }
}
