import { container } from "@sapphire/framework";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { StipendSchedule } from "../lib/stipendSchedule.js";
import { StipendRepository } from "../repositories/stipendRepository.js";
import { CoinsError, type StipendView } from "../types/coins.js";
import { CoinService } from "./coinService.js";

export class StipendService {
  public static async list(guildId: string): Promise<StipendView[]> {
    const stipends = await StipendRepository.list(guildId);

    const roleNames = await PermissionService.getRoleNames(guildId);

    return stipends.map((stipend) => ({
      id: stipend.id,
      roleId: stipend.roleId,
      roleName: roleNames.get(stipend.roleId) ?? "удалённая роль",
      amount: stipend.amount,
      lastPaidAt: stipend.lastPaidAt,
    }));
  }

  public static async get(guildId: string, stipendId: string) {
    const stipend = (await this.list(guildId)).find(
      (item) => item.id === stipendId,
    );

    if (!stipend) {
      throw new CoinsError("Начисление не найдено.");
    }

    return stipend;
  }

  public static async set(guildId: string, roleId: string, amountInput: string) {
    const amount = CoinService.parseAmount(amountInput);

    const roleNames = await PermissionService.getRoleNames(guildId);

    if (!roleNames.has(roleId)) {
      throw new CoinsError("Роль не найдена на сервере.");
    }

    return StipendRepository.upsert(guildId, roleId, amount);
  }

  public static async delete(guildId: string, stipendId: string) {
    const stipend = await this.get(guildId, stipendId);

    await StipendRepository.delete(stipend.id);

    return stipend;
  }

  public static async runDue(now = new Date()) {
    const stipends = (await StipendRepository.listAll()).filter((stipend) =>
      StipendSchedule.isDue(stipend.lastPaidAt, now),
    );

    for (const stipend of stipends) {
      try {
        const memberIds = await this.getRoleMemberIds(
          stipend.guildId,
          stipend.roleId,
        );

        if (memberIds === null) {
          continue;
        }

        const paid = await StipendRepository.pay(
          stipend.id,
          stipend.lastPaidAt,
          memberIds,
          stipend.amount,
          "Еженедельное начисление по роли",
        );

        container.logger.info(
          `Paid weekly stipend ${stipend.amount} to ${paid} members of role ${stipend.roleId}`,
        );
      } catch (error) {
        container.logger.error(error);
      }
    }
  }

  private static async getRoleMemberIds(guildId: string, roleId: string) {
    const guild = await container.client.guilds.fetch(guildId).catch(() => null);

    if (!guild) {
      return null;
    }

    try {
      await guild.members.fetch();
    } catch (error) {
      container.logger.warn(
        `Cannot fetch guild members for stipends (is Server Members Intent enabled?): ${String(error)}`,
      );
      return null;
    }

    const role = await guild.roles.fetch(roleId).catch(() => null);

    if (!role) {
      return null;
    }

    return [...role.members.filter((member) => !member.user.bot).keys()];
  }
}
