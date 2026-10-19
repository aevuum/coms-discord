import type { Client } from "discord.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { GiveawayRepository } from "../repositories/giveawayRepository.js";
import { GiveawayService } from "../service/giveawayService.js";
import { GiveawayAdminContainer } from "./giveawayAdminContainer.js";

export class GiveawayAdminViews {
  public static async root(client: Client, guildId: string) {
    const [active, finished] = await GiveawayRepository.listForAdmin(guildId);
    const settings = await GiveawayRepository.getSettings(guildId);

    return GiveawayAdminContainer.root(
      active,
      finished,
      await GiveawayService.counts([...active, ...finished]),
      settings,
      this.channelName(client, guildId, settings?.channelId ?? null),
    );
  }

  public static async view(guildId: string, id: string) {
    const giveaway = await GiveawayService.get(guildId, id);

    return GiveawayAdminContainer.view(
      giveaway,
      await GiveawayRepository.countEntries(giveaway.id),
      GiveawayService.messageUrl(giveaway),
    );
  }

  public static async settings(client: Client, guildId: string) {
    const settings = await GiveawayRepository.getSettings(guildId);
    const guild = client.guilds.cache.get(guildId);

    return GiveawayAdminContainer.settings(
      settings,
      this.channelName(client, guildId, settings?.channelId ?? null),
      settings?.pingRoleId ? (guild?.roles.cache.get(settings.pingRoleId)?.name ?? "удалённая роль") : null,
    );
  }

  public static channelPicker(client: Client, guildId: string, page: number) {
    return GiveawayAdminContainer.channelPicker(
      GiveawayService.getChannelPage(GiveawayService.getGuild(client, guildId), page),
    );
  }

  public static async rolePicker(guildId: string, page: number) {
    return GiveawayAdminContainer.rolePicker(await PermissionService.getRolePage(guildId, page));
  }

  private static channelName(client: Client, guildId: string, channelId: string | null) {
    if (!channelId) {
      return null;
    }

    const channel = client.guilds.cache.get(guildId)?.channels.cache.get(channelId);

    return channel?.name ?? "удалённый канал";
  }
}
