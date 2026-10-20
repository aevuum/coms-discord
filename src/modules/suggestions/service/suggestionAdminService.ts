import type { BaseInteraction, Client } from "discord.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { SuggestionAdminContainer } from "../lib/suggestionAdminContainer.js";
import { SuggestionRepository } from "../repositories/suggestionRepository.js";
import { SuggestionError } from "../types/suggestion.js";

export class SuggestionAdminService {
  public static readonly MANAGE_KEY = "manage.suggestions";

  public static async assertCanManage(interaction: BaseInteraction) {
    const subject = await PermissionService.resolveSubject(interaction);

    if (!subject.guildId || !(await PermissionService.canUse(subject, this.MANAGE_KEY))) {
      throw new SuggestionError("У вас нет доступа к настройке идей.");
    }

    return subject.guildId;
  }

  public static async root(client: Client, guildId: string) {
    const settings = await SuggestionRepository.getSettings(guildId);

    return SuggestionAdminContainer.root(this.roleName(client, guildId, settings?.pingRoleId ?? null));
  }

  public static async rolePicker(guildId: string, page: number) {
    const settings = await SuggestionRepository.getSettings(guildId);

    return SuggestionAdminContainer.rolePicker(
      await PermissionService.getRolePage(guildId, page),
      settings?.pingRoleId ?? null,
    );
  }

  public static async setPingRole(client: Client, guildId: string, roleId: string | null) {
    if (roleId && !client.guilds.cache.get(guildId)?.roles.cache.has(roleId)) {
      throw new SuggestionError("Роль не найдена.");
    }

    await SuggestionRepository.setPingRole(guildId, roleId);
  }

  private static roleName(client: Client, guildId: string, roleId: string | null) {
    if (!roleId) {
      return null;
    }

    return client.guilds.cache.get(guildId)?.roles.cache.get(roleId)?.name ?? "удалённая роль";
  }
}
