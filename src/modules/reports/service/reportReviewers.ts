import { PermissionFlagsBits, type BaseInteraction, type GuildMember } from "discord.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { ReportSettingsRepository } from "../repositories/reportSettingsRepository.js";
import { ReportError } from "../types/report.js";

export class ReportReviewers {
  public static readonly MANAGE_KEY = "manage.reports";

  public static readonly MAX_ROLES = 25;

  public static async canReview(member: GuildMember) {
    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
      return true;
    }

    const roleIds = await ReportSettingsRepository.getReviewerRoleIds(member.guild.id);

    return roleIds.some((roleId) => member.roles.cache.has(roleId));
  }

  public static async assertCanManage(interaction: BaseInteraction) {
    const subject = await PermissionService.resolveSubject(interaction);

    if (!subject.guildId || !(await PermissionService.canUse(subject, this.MANAGE_KEY))) {
      throw new ReportError("У вас нет доступа к настройке жалоб.");
    }

    return subject.guildId;
  }

  public static async getView(guildId: string, page: number) {
    return {
      roleIds: await ReportSettingsRepository.getReviewerRoleIds(guildId),
      rolePage: await PermissionService.getRolePage(guildId, page),
      roleNames: await PermissionService.getRoleNames(guildId),
    };
  }

  public static async setOnPage(guildId: string, page: number, selected: string[]) {
    const current = await ReportSettingsRepository.getReviewerRoleIds(guildId);
    const pageRoleIds = (await PermissionService.getRolePage(guildId, page)).roles.map((role) => role.id);

    const next = [
      ...current.filter((roleId) => !pageRoleIds.includes(roleId)),
      ...selected.filter((roleId) => pageRoleIds.includes(roleId)),
    ];

    const unique = [...new Set(next)];

    if (unique.length > this.MAX_ROLES) {
      throw new ReportError(`Можно назначить не больше ${this.MAX_ROLES} ролей.`);
    }

    await ReportSettingsRepository.setReviewerRoleIds(guildId, unique);
  }

  public static async clear(guildId: string) {
    await ReportSettingsRepository.setReviewerRoleIds(guildId, []);
  }
}
