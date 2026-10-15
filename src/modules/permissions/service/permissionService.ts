import { container, type ChatInputCommand } from "@sapphire/framework";

import { PermissionFlagsBits, type BaseInteraction } from "discord.js";

import {
  LEGACY_PERMISSION_KEYS,
  MANAGE_SECTIONS,
} from "../../manage/lib/manageSections.js";
import { PermissionCache } from "../cache/permissionCache.js";
import { PermissionRepository } from "../repositories/permissionRepository.js";
import {
  CommandAccess,
  PermissionError,
  type AccessSubject,
  type GuildRoleOption,
  type PermissionTarget,
  type PermissionTargetEntry,
  type RolePage,
} from "../types/permissions.js";

export class PermissionService {
  public static readonly ROLES_PER_PAGE = 25;

  private static readonly MAX_ROLES = 25;

  public static async resolveSubject(
    interaction: BaseInteraction,
  ): Promise<AccessSubject> {
    if (interaction.guildId) {
      return {
        guildId: interaction.guildId,
        member: interaction.member,
        memberPermissions: interaction.memberPermissions,
      };
    }

    const guild = await this.getHomeGuild();

    const member = guild
      ? await guild.members.fetch(interaction.user.id).catch(() => null)
      : null;

    if (!guild || !member) {
      return {
        guildId: null,
        member: null,
        memberPermissions: null,
      };
    }

    return {
      guildId: guild.id,
      member,
      memberPermissions: member.permissions,
    };
  }

  public static isAdmin(subject: AccessSubject) {
    return (
      subject.memberPermissions?.has(PermissionFlagsBits.Administrator) ??
      false
    );
  }

  public static async canUse(subject: AccessSubject, key: string) {
    const target = this.getTarget(key);

    if (!target) {
      return false;
    }

    if (this.isAdmin(subject)) {
      return true;
    }

    if (target.access === CommandAccess.Admin) {
      return false;
    }

    if (target.access === CommandAccess.Delegated) {
      return (await this.getAvailableSections(subject)).length > 0;
    }

    if (!subject.guildId) {
      return target.access === CommandAccess.Public;
    }

    const roleIds = await this.getRoles(subject.guildId, target.key);

    if (!roleIds.length) {
      return target.access === CommandAccess.Public;
    }

    const memberRoles = this.getMemberRoleIds(subject.member);

    return roleIds.some(
      (roleId) => roleId === subject.guildId || memberRoles.includes(roleId),
    );
  }

  public static async getAvailableSections(subject: AccessSubject) {
    const available = [];

    for (const section of MANAGE_SECTIONS) {
      if (await this.canUse(subject, section.key)) {
        available.push(section);
      }
    }

    return available;
  }

  public static async assertCanUse(subject: AccessSubject, key: string) {
    if (!(await this.canUse(subject, key))) {
      throw new PermissionError("У вас нет доступа к этому разделу.");
    }
  }

  public static async listTargets(
    guildId: string,
  ): Promise<PermissionTargetEntry[]> {
    const permissions = await this.loadGuild(guildId);

    return this.getConfigurableTargets().map((target) => ({
      ...target,
      roleIds: permissions.get(target.key) ?? [],
    }));
  }

  public static async getTargetEntry(
    guildId: string,
    key: string,
  ): Promise<PermissionTargetEntry> {
    const target = this.getConfigurableTarget(key);

    return {
      ...target,
      roleIds: await this.getRoles(guildId, target.key),
    };
  }

  public static async setRoles(
    subject: AccessSubject,
    key: string,
    roleIds: string[],
  ) {
    this.assertAdmin(subject);

    const target = this.getConfigurableTarget(key);

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

    await PermissionRepository.setRoles(guildId, target.key, unique);

    PermissionCache.setCommand(guildId, target.key, unique);

    return this.getTargetEntry(guildId, target.key);
  }

  public static async setRolesOnPage(
    subject: AccessSubject,
    key: string,
    page: number,
    selectedRoleIds: string[],
  ) {
    this.assertAdmin(subject);

    const guildId = subject.guildId as string;

    const current = await this.getRoles(guildId, key);

    const pageRoleIds = (await this.getRolePage(guildId, page)).roles.map(
      (role) => role.id,
    );

    const next = [
      ...current.filter((roleId) => !pageRoleIds.includes(roleId)),
      ...selectedRoleIds.filter((roleId) => pageRoleIds.includes(roleId)),
    ];

    return this.setRoles(subject, key, next);
  }

  public static async getRolePage(
    guildId: string,
    page: number,
  ): Promise<RolePage> {
    const roles = await this.getGuildRoles(guildId);

    const totalPages = Math.max(
      1,
      Math.ceil(roles.length / this.ROLES_PER_PAGE),
    );

    const safePage = Number.isInteger(page)
      ? Math.min(Math.max(page, 0), totalPages - 1)
      : 0;

    return {
      roles: roles.slice(
        safePage * this.ROLES_PER_PAGE,
        (safePage + 1) * this.ROLES_PER_PAGE,
      ),
      page: safePage,
      totalPages,
    };
  }

  public static async getRoleNames(guildId: string) {
    const roles = await this.getGuildRoles(guildId);

    return new Map(roles.map((role) => [role.id, role.name]));
  }

  public static async getOverview(subject: AccessSubject) {
    this.assertAdmin(subject);

    const guildId = subject.guildId as string;

    return {
      targets: await this.listTargets(guildId),
      roleNames: await this.getRoleNames(guildId),
    };
  }

  public static async getTargetView(
    subject: AccessSubject,
    key: string,
    page: number,
  ) {
    this.assertAdmin(subject);

    const guildId = subject.guildId as string;

    return {
      target: await this.getTargetEntry(guildId, key),
      rolePage: await this.getRolePage(guildId, page),
      roleNames: await this.getRoleNames(guildId),
    };
  }

  public static assertAdmin(subject: AccessSubject) {
    if (!subject.guildId) {
      throw new PermissionError(
        "Вы не состоите на сервере бота или сервер не настроен.",
      );
    }

    if (!this.isAdmin(subject)) {
      throw new PermissionError(
        "Настраивать доступ могут только администраторы сервера.",
      );
    }
  }

  public static async migrateLegacyKeys() {
    const moved = await PermissionRepository.renameKeys(LEGACY_PERMISSION_KEYS);

    if (moved) {
      PermissionCache.clear();
    }

    return moved;
  }

  private static async getGuildRoles(
    guildId: string,
  ): Promise<GuildRoleOption[]> {
    const guild = await container.client.guilds.fetch(guildId).catch(() => null);

    if (!guild) {
      return [];
    }

    const roles = await guild.roles.fetch();

    return [...roles.values()]
      .filter((role) => role.id !== guild.id && !role.managed)
      .sort((left, right) => right.position - left.position)
      .map((role) => ({
        id: role.id,
        name: role.name,
      }));
  }

  private static async getHomeGuild() {
    const guildId = process.env.GUILD_ID;

    if (!guildId) {
      return null;
    }

    return container.client.guilds.fetch(guildId).catch(() => null);
  }

  private static async getRoles(guildId: string, key: string) {
    const permissions = await this.loadGuild(guildId);

    return permissions.get(key) ?? [];
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

  private static getTarget(key: string): PermissionTarget | null {
    const section = MANAGE_SECTIONS.find((item) => item.key === key);

    if (section) {
      return {
        key: section.key,
        label: `Управление · ${section.label}`,
        description: section.description,
        access: section.access,
      };
    }

    const command = container.stores.get("commands").get(key);

    if (!command?.supportsChatInputCommands()) {
      return null;
    }

    return {
      key: command.name,
      label: `/${command.name}`,
      description: command.description,
      access: (command as ChatInputCommand).options.access ?? CommandAccess.Public,
    };
  }

  private static getConfigurableTargets(): PermissionTarget[] {
    const commands = [...container.stores.get("commands").values()]
      .filter((command) => command.supportsChatInputCommands())
      .map((command) => this.getTarget(command.name))
      .filter((target): target is PermissionTarget => target !== null)
      .sort((left, right) => left.key.localeCompare(right.key));

    const sections = MANAGE_SECTIONS.map((section) =>
      this.getTarget(section.key),
    ).filter((target): target is PermissionTarget => target !== null);

    return [...commands, ...sections].filter((target) =>
      this.isConfigurable(target),
    );
  }

  private static getConfigurableTarget(key: string) {
    const target = this.getTarget(key);

    if (!target || !this.isConfigurable(target)) {
      throw new PermissionError("Этот раздел нельзя настроить.");
    }

    return target;
  }

  private static isConfigurable(target: PermissionTarget) {
    return (
      target.access === CommandAccess.Public ||
      target.access === CommandAccess.Restricted
    );
  }
}
