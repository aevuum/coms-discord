import type { Client } from "discord.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { LocationService } from "../service/locationService.js";
import { TravelService } from "../service/travelService.js";
import { SettingsField } from "../types/locations.js";
import { LocationAdminContainer } from "./locationAdminContainer.js";
import { LocationAdminAction, LocationCustomIds } from "./locationCustomIds.js";
import { LocationFormatter } from "./locationFormatter.js";

export class LocationAdminViews {
  public static async root(client: Client, guildId: string) {
    return LocationAdminContainer.root(await LocationService.list(guildId), (roleId) =>
      LocationService.roleName(client, roleId),
    );
  }

  public static async view(client: Client, guildId: string, id: string) {
    const location = await LocationService.get(guildId, id);

    const arrival = location.arrivalChannelId
      ? (TravelService.getGuild(client).channels.cache.get(location.arrivalChannelId)?.name ?? null)
      : null;

    return LocationAdminContainer.view(location, LocationService.roleName(client, location.roleId), arrival);
  }

  public static async addRole(guildId: string, page: number) {
    return LocationAdminContainer.rolePicker(await PermissionService.getRolePage(guildId, page));
  }

  public static async arrival(client: Client, guildId: string, id: string, page: number) {
    const location = await LocationService.get(guildId, id);

    return LocationAdminContainer.channelPicker({
      title: `Канал прибытия · ${LocationFormatter.title(location)}`,
      description: "Бот будет писать сюда, когда игрок прибывает в локацию. Подходят только текстовые каналы.",
      page: LocationService.getChannelPage(client, page),
      selectId: LocationCustomIds.build(LocationAdminAction.Arrival, id),
      pageId: (next) => LocationCustomIds.build(LocationAdminAction.ArrivalPage, id, String(next)),
      clearId: location.arrivalChannelId ? LocationCustomIds.build(LocationAdminAction.ArrivalClear, id) : null,
      backId: LocationCustomIds.build(LocationAdminAction.View, id),
    });
  }

  public static async settings(client: Client, guildId: string) {
    return LocationAdminContainer.settings(await LocationService.getSettings(client, guildId));
  }

  public static async settingsPicker(client: Client, guildId: string, field: SettingsField, page: number) {
    if (field === SettingsField.TravelRole) {
      return LocationAdminContainer.travelRolePicker(await PermissionService.getRolePage(guildId, page));
    }

    const label = LocationAdminContainer.settingsLabel(field);

    return LocationAdminContainer.channelPicker({
      title: label.label,
      description: `${label.description}.`,
      page: LocationService.getChannelPage(client, page),
      selectId: LocationCustomIds.build(LocationAdminAction.SettingsSet, field),
      pageId: (next) => LocationCustomIds.build(LocationAdminAction.SettingsPage, field, String(next)),
      clearId: LocationCustomIds.build(LocationAdminAction.SettingsClear, field),
      backId: LocationCustomIds.build(LocationAdminAction.Settings),
    });
  }

  public static async moveTargets(client: Client, guildId: string, discordId: string) {
    const guild = TravelService.getGuild(client);

    const member = await guild.members.fetch(discordId).catch(() => null);

    const locations = await LocationService.list(guildId);

    return LocationAdminContainer.moveTargets(
      member?.displayName ?? discordId,
      discordId,
      member ? TravelService.currentLocation(member, locations) : null,
      locations,
    );
  }

  public static isSettingsField(value: string): value is SettingsField {
    return (Object.values(SettingsField) as string[]).includes(value);
  }
}
