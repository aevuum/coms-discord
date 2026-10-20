import type { Client } from "discord.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { PingRolesService } from "../service/pingRolesService.js";
import { PingRoleAdminContainer } from "./pingRoleAdminContainer.js";

export class PingRoleAdminViews {
  public static async root(client: Client) {
    return PingRoleAdminContainer.root(await PingRolesService.list(), (id) => this.roleName(client, id));
  }

  public static async addPicker(page: number) {
    const existing = new Set((await PingRolesService.list()).map((role) => role.roleId));

    return PingRoleAdminContainer.addPicker(
      await PermissionService.getRolePage(PingRolesService.guildId(), page),
      existing,
    );
  }

  public static async view(client: Client, roleId: string) {
    const roles = await PingRolesService.list();
    const index = roles.findIndex((role) => role.roleId === roleId);

    if (index < 0) {
      return this.root(client);
    }

    return PingRoleAdminContainer.view(roles[index], this.roleName(client, roleId), index, roles.length);
  }

  public static roleName(client: Client, roleId: string) {
    return client.guilds.cache.get(PingRolesService.guildId())?.roles.cache.get(roleId)?.name ?? "удалённая роль";
  }
}
