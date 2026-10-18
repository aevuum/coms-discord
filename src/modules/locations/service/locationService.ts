import { ChannelType, type BaseInteraction, type Client } from "discord.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { SEED_LOCATIONS, SEED_ROUTES } from "../lib/locationSeed.js";
import { LocationRepository } from "../repositories/locationRepository.js";
import {
  LocationError,
  SettingsField,
  type ChannelPage,
  type SettingsView,
} from "../types/locations.js";
import { TravelService } from "./travelService.js";

const CHANNELS_PER_PAGE = 25;

const SETTINGS_COLUMNS = {
  [SettingsField.Request]: "requestChannelId",
  [SettingsField.Log]: "logChannelId",
  [SettingsField.Guide]: "guideChannelId",
  [SettingsField.TravelRole]: "travelRoleId",
} as const;

export class LocationService {
  public static readonly MAX_LOCATIONS = 25;

  public static readonly MAX_ROUTES = 25;

  public static async assertCanManage(interaction: BaseInteraction) {
    const subject = await PermissionService.resolveSubject(interaction);

    if (!subject.guildId || !(await PermissionService.canUse(subject, TravelService.MANAGE_KEY))) {
      throw new LocationError("У вас нет доступа к управлению локациями.");
    }

    return subject.guildId;
  }

  public static async seedDefaults(client: Client) {
    const guild = TravelService.getGuild(client);

    if (await LocationRepository.count(guild.id)) {
      return 0;
    }

    const ids = new Map<string, string>();

    for (const [index, seed] of SEED_LOCATIONS.entries()) {
      if (!guild.roles.cache.has(seed.roleId)) {
        continue;
      }

      const location = await LocationRepository.create({
        guildId: guild.id,
        roleId: seed.roleId,
        name: seed.name,
        emoji: seed.emoji,
        description: seed.description,
        access: seed.access,
        sortOrder: index,
      });

      ids.set(seed.key, location.id);
    }

    for (const route of SEED_ROUTES) {
      const fromId = ids.get(route.from);
      const toId = ids.get(route.to);

      if (!fromId || !toId) {
        continue;
      }

      await LocationRepository.createRoute({
        fromId,
        toId,
        method: route.method,
        travelMinutes: route.travelMinutes,
        itemName: route.itemName ?? null,
        itemKey: route.itemName ? route.itemName.toLocaleLowerCase("ru") : null,
        itemQuantity: route.itemQuantity ?? 1,
        adultOnly: route.adultOnly ?? false,
      });
    }

    return ids.size;
  }

  public static list(guildId: string) {
    return LocationRepository.listWithRoutes(guildId);
  }

  public static async get(guildId: string, id: string) {
    const location = await LocationRepository.get(guildId, id);

    if (!location) {
      throw new LocationError("Локация не найдена.");
    }

    return location;
  }

  public static async create(
    client: Client,
    guildId: string,
    roleId: string,
    nameInput: string,
    emojiInput: string,
    descriptionInput: string,
  ) {
    if ((await LocationRepository.count(guildId)) >= this.MAX_LOCATIONS) {
      throw new LocationError(`Локаций не может быть больше ${this.MAX_LOCATIONS}.`);
    }

    if (await LocationRepository.findByRole(guildId, roleId)) {
      throw new LocationError("Эта роль уже привязана к другой локации.");
    }

    const guild = TravelService.getGuild(client);

    if (!guild.roles.cache.has(roleId)) {
      throw new LocationError("Роль не найдена на сервере.");
    }

    return LocationRepository.create({
      guildId,
      roleId,
      name: this.parseName(nameInput),
      emoji: this.parseEmoji(client, emojiInput),
      description: this.parseDescription(descriptionInput),
      sortOrder: await LocationRepository.count(guildId),
    });
  }

  public static async edit(
    client: Client,
    guildId: string,
    id: string,
    nameInput: string,
    emojiInput: string,
    descriptionInput: string,
  ) {
    await this.get(guildId, id);

    return LocationRepository.update(id, {
      name: this.parseName(nameInput),
      emoji: this.parseEmoji(client, emojiInput),
      description: this.parseDescription(descriptionInput),
    });
  }

  public static async toggleAccess(guildId: string, id: string) {
    const location = await this.get(guildId, id);

    return LocationRepository.update(id, {
      access: location.access === "APPROVAL" ? "OPEN" : "APPROVAL",
    });
  }

  public static async setArrivalChannel(guildId: string, id: string, channelId: string | null) {
    await this.get(guildId, id);

    return LocationRepository.update(id, { arrivalChannelId: channelId });
  }

  public static async delete(guildId: string, id: string) {
    await this.get(guildId, id);

    await LocationRepository.delete(id);
  }

  public static async addRoute(
    guildId: string,
    fromId: string,
    toId: string,
    input: {
      method: string;
      minutes: string;
      itemName: string;
      itemQuantity: string;
      adultOnly: boolean;
      reverse: boolean;
    },
  ) {
    const from = await this.get(guildId, fromId);
    const to = await this.get(guildId, toId);

    if (from.id === to.id) {
      throw new LocationError("Нельзя проложить путь в ту же локацию.");
    }

    const method = input.method.trim().replace(/\s+/g, " ");

    if (method.length < 2 || method.length > 40) {
      throw new LocationError("Способ перемещения должен быть от 2 до 40 символов.");
    }

    const minutes = this.parseInt(input.minutes || "0", 0, 1440, "Время в пути должно быть от 0 до 1440 минут.");

    const itemName = input.itemName.trim().replace(/\s+/g, " ");

    if (itemName.length > 80) {
      throw new LocationError("Название предмета должно быть не длиннее 80 символов.");
    }

    const itemQuantity = itemName
      ? this.parseInt(input.itemQuantity || "1", 1, 100, "Количество предмета должно быть от 1 до 100.")
      : 1;

    const data = {
      method,
      travelMinutes: minutes,
      itemName: itemName || null,
      itemKey: itemName ? itemName.toLocaleLowerCase("ru") : null,
      itemQuantity,
      adultOnly: input.adultOnly,
    };

    if (from.routesFrom.length >= this.MAX_ROUTES) {
      throw new LocationError(`Из одной локации может вести не больше ${this.MAX_ROUTES} путей.`);
    }

    await LocationRepository.createRoute({ fromId: from.id, toId: to.id, ...data });

    if (input.reverse) {
      const back = await this.get(guildId, to.id);

      if (back.routesFrom.length < this.MAX_ROUTES) {
        await LocationRepository.createRoute({ fromId: to.id, toId: from.id, ...data });
      }
    }

    return this.get(guildId, from.id);
  }

  public static async deleteRoute(guildId: string, locationId: string, routeId: string) {
    const location = await this.get(guildId, locationId);

    if (!location.routesFrom.some((route) => route.id === routeId)) {
      throw new LocationError("Путь не найден.");
    }

    await LocationRepository.deleteRoute(routeId);

    return this.get(guildId, locationId);
  }

  public static async getSettings(client: Client, guildId: string): Promise<SettingsView> {
    const settings = await LocationRepository.getSettings(guildId);

    const guild = TravelService.getGuild(client);

    const channelName = (id: string | null) => (id ? (guild.channels.cache.get(id)?.name ?? null) : null);

    return {
      ...settings,
      requestChannelName: channelName(settings.requestChannelId),
      logChannelName: channelName(settings.logChannelId),
      guideChannelName: channelName(settings.guideChannelId),
      travelRoleName: settings.travelRoleId
        ? (guild.roles.cache.get(settings.travelRoleId)?.name ?? null)
        : null,
    };
  }

  public static async setSetting(
    client: Client,
    guildId: string,
    field: SettingsField,
    value: string | null,
  ) {
    const guild = TravelService.getGuild(client);

    if (value) {
      const valid =
        field === SettingsField.TravelRole
          ? guild.roles.cache.has(value)
          : guild.channels.cache.get(value)?.isTextBased();

      if (!valid) {
        throw new LocationError("Канал или роль не найдены на сервере.");
      }
    }

    const column = SETTINGS_COLUMNS[field];

    if (!column) {
      throw new LocationError("Неизвестная настройка.");
    }

    await LocationRepository.updateSettings(guildId, { [column]: value });

    if (field === SettingsField.Guide && value) {
      await TravelService.syncPanel(client as Client<true>);
    }

    return this.getSettings(client, guildId);
  }

  public static getChannelPage(client: Client, page: number): ChannelPage {
    const guild = TravelService.getGuild(client);

    const channels = [...guild.channels.cache.values()]
      .filter(
        (channel) =>
          channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement,
      )
      .sort((a, b) => a.rawPosition - b.rawPosition)
      .map((channel) => ({ id: channel.id, name: channel.name }));

    const totalPages = Math.max(1, Math.ceil(channels.length / CHANNELS_PER_PAGE));

    const safePage = Number.isInteger(page) ? Math.min(Math.max(page, 0), totalPages - 1) : 0;

    return {
      channels: channels.slice(safePage * CHANNELS_PER_PAGE, (safePage + 1) * CHANNELS_PER_PAGE),
      page: safePage,
      totalPages,
    };
  }

  public static roleName(client: Client, roleId: string) {
    return TravelService.getGuild(client).roles.cache.get(roleId)?.name ?? "удалённая роль";
  }

  public static cleanRoleName(name: string) {
    return name.replace(/[⌇❝.:]/g, " ").replace(/\p{Extended_Pictographic}|️/gu, "").replace(/\s+/g, " ").trim();
  }

  private static parseName(input: string) {
    const name = input.trim().replace(/\s+/g, " ");

    if (name.length < 2 || name.length > 40) {
      throw new LocationError("Название локации должно быть от 2 до 40 символов.");
    }

    return name;
  }

  private static parseDescription(input: string) {
    const description = input.trim();

    if (description.length > 300) {
      throw new LocationError("Описание должно быть не длиннее 300 символов.");
    }

    return description || null;
  }

  private static parseEmoji(client: Client, input: string) {
    const text = input.trim();

    if (!text) {
      return null;
    }

    const custom = text.match(/^<a?:\w{2,32}:(\d{17,20})>$/);

    if (custom) {
      if (!client.emojis.cache.has(custom[1])) {
        throw new LocationError("Бот не может использовать этот эмодзи. Выберите эмодзи с сервера или обычный.");
      }

      return text;
    }

    if (/^(\p{Extended_Pictographic}|\p{Regional_Indicator}|‍|️|⃣|[#*0-9]|\p{Emoji_Modifier})+$/u.test(text) && [...text].length <= 8) {
      return text;
    }

    throw new LocationError("Эмодзи должен быть одним обычным эмодзи или эмодзи с сервера.");
  }

  private static parseInt(input: string, min: number, max: number, message: string) {
    const text = input.trim();

    if (!/^\d+$/.test(text)) {
      throw new LocationError(message);
    }

    const value = Number(text);

    if (value < min || value > max) {
      throw new LocationError(message);
    }

    return value;
  }
}
