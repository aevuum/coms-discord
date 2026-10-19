import { container } from "@sapphire/framework";

import {
  MessageFlags,
  type BaseInteraction,
  type Client,
  type ContainerBuilder,
  type Guild,
  type GuildMember,
  type Message,
  type TopLevelComponent,
} from "discord.js";

import type { Location, Travel } from "../../../database/generated/prisma/client.js";

import { CharacterInventoryRepository } from "../../character/repositories/characterInventoryRepository.js";
import { PermissionService } from "../../permissions/service/permissionService.js";
import { TravelAction, TravelCustomIds } from "../lib/locationCustomIds.js";
import { LocationFormatter } from "../lib/locationFormatter.js";
import { TravelContainer } from "../lib/travelContainer.js";
import { LocationRepository } from "../repositories/locationRepository.js";
import { TravelRepository } from "../repositories/travelRepository.js";
import {
  LocationError,
  type GuideView,
  type RouteWithTarget,
  type TravelPlan,
} from "../types/locations.js";

export class TravelService {
  public static readonly MANAGE_KEY = "manage.locations";

  public static getGuild(client: Client) {
    const guild = client.guilds.cache.get(process.env.GUILD_ID ?? "");

    if (!guild) {
      throw new LocationError("Сервер ролевой недоступен.");
    }

    return guild;
  }

  public static async getMember(interaction: BaseInteraction) {
    const guild = this.getGuild(interaction.client);

    const member = await guild.members.fetch(interaction.user.id).catch(() => null);

    if (!member) {
      throw new LocationError("Вы не состоите на сервере ролевой.");
    }

    return member;
  }

  public static currentLocation(member: GuildMember, locations: Location[]) {
    return locations.find((location) => member.roles.cache.has(location.roleId)) ?? null;
  }

  public static async getGuide(member: GuildMember): Promise<GuideView> {
    const locations = await LocationRepository.listWithRoutes(member.guild.id);

    const current = this.currentLocation(member, locations);

    const travel = await TravelRepository.findByUser(member.id);

    return {
      current: current ?? null,
      routes: current ? locations.find((entry) => entry.id === current.id)!.routesFrom : [],
      locations,
      travel: travel
        ? { ...travel, to: locations.find((entry) => entry.id === travel.toId) ?? null }
        : null,
    };
  }

  public static async plan(member: GuildMember, routeId: string): Promise<TravelPlan> {
    if (await TravelRepository.findByUser(member.id)) {
      throw new LocationError("Вы уже в пути или ждёте решения по заявке.");
    }

    const route = await LocationRepository.getRoute(routeId);

    if (!route || route.from.guildId !== member.guild.id) {
      throw new LocationError("Этот путь больше не существует.");
    }

    const locations = await LocationRepository.list(member.guild.id);

    const from = this.currentLocation(member, locations);

    if (!from || from.id !== route.fromId) {
      throw new LocationError("Вы уже не находитесь в начале этого пути. Откройте путеводитель заново.");
    }

    return { route, from, payer: await this.checkRequirements(member.id, route) };
  }

  public static async start(member: GuildMember, routeId: string) {
    const plan = await this.plan(member, routeId);

    if (LocationFormatter.needsApproval(plan.route)) {
      await this.requestApproval(member, plan);

      return TravelContainer.success(
        "Заявка отправлена",
        `Кураторы рассмотрят вашу заявку на перемещение в **${LocationFormatter.title(plan.route.to)}**. Решение придёт в личные сообщения.`,
      );
    }

    return this.depart(member, plan);
  }

  public static async cancel(member: GuildMember) {
    const travel = await TravelRepository.findByUser(member.id);

    if (!travel || travel.status !== "PENDING") {
      throw new LocationError("У вас нет активной заявки.");
    }

    if (!(await TravelRepository.claimPending(travel.id))) {
      throw new LocationError("Заявка уже рассмотрена.");
    }

    await this.updateRequest(member.guild, travel, member.displayName, { status: "cancelled" });
  }

  public static async approve(interaction: BaseInteraction, travelId: string) {
    await this.assertCurator(interaction);

    const travel = await TravelRepository.findById(travelId);

    if (!travel || travel.status !== "PENDING" || !(await TravelRepository.claimPending(travel.id))) {
      throw new LocationError("Заявка уже рассмотрена или отменена.");
    }

    const guild = this.getGuild(interaction.client);

    const member = await guild.members.fetch(travel.userId).catch(() => null);

    if (!member) {
      await this.updateRequest(guild, travel, travel.userId, {
        status: "failed",
        reason: "игрок покинул сервер",
      });

      throw new LocationError("Игрок покинул сервер.");
    }

    try {
      const plan = await this.plan(member, travel.routeId);

      await this.depart(member, plan, true);

      await this.updateRequest(guild, travel, member.displayName, {
        status: "approved",
        by: interaction.user.id,
      });
    } catch (error) {
      const reason = error instanceof Error && this.isUserError(error) ? error.message : "внутренняя ошибка";

      await this.updateRequest(guild, travel, member.displayName, { status: "failed", reason });

      await this.dm(member, TravelContainer.error(`Куратор одобрил перемещение, но оно не удалось: ${reason}`));

      throw error;
    }
  }

  public static async reject(interaction: BaseInteraction, travelId: string) {
    await this.assertCurator(interaction);

    const travel = await TravelRepository.findById(travelId);

    if (!travel || travel.status !== "PENDING" || !(await TravelRepository.claimPending(travel.id))) {
      throw new LocationError("Заявка уже рассмотрена или отменена.");
    }

    const guild = this.getGuild(interaction.client);

    const member = await guild.members.fetch(travel.userId).catch(() => null);

    await this.updateRequest(guild, travel, member?.displayName ?? travel.userId, {
      status: "rejected",
      by: interaction.user.id,
    });

    const target = (await LocationRepository.list(guild.id)).find((entry) => entry.id === travel.toId);

    if (member) {
      await this.dm(
        member,
        TravelContainer.notice(
          "<:240191mark:1518581039172292688> Заявка отклонена",
          `Куратор не разрешил перемещение в **${target ? LocationFormatter.title(target) : "локацию"}**.`,
        ),
      );
    }
  }

  public static async processArrivals(client: Client) {
    const due = await TravelRepository.listArrived(new Date());

    if (!due.length) {
      return 0;
    }

    const guild = this.getGuild(client);

    let arrived = 0;

    for (const travel of due) {
      if (!(await TravelRepository.claim(travel.id))) {
        continue;
      }

      try {
        await this.arriveById(guild, travel);
        arrived++;
      } catch (error) {
        container.logger.error(error);
      }
    }

    return arrived;
  }

  public static async moveByCurator(guild: Guild, discordId: string, locationId: string, curatorId: string) {
    const location = (await LocationRepository.list(guild.id)).find((entry) => entry.id === locationId);

    if (!location) {
      throw new LocationError("Локация не найдена.");
    }

    const member = await guild.members.fetch(discordId).catch(() => null);

    if (!member) {
      throw new LocationError("Игрок не найден на сервере.");
    }

    const travel = await TravelRepository.findByUser(discordId);

    if (travel) {
      await TravelRepository.claim(travel.id);

      if (travel.status === "PENDING") {
        await this.updateRequest(guild, travel, member.displayName, { status: "cancelled" });
      }
    }

    await this.placeAt(member, location);

    await this.log(
      guild,
      `<@${curatorId}> переместил(а) <@${member.id}> в **${LocationFormatter.title(location)}**.`,
    );

    return { member, location };
  }

  public static async syncPanel(client: Client<true>) {
    const settings = await LocationRepository.getSettings(this.getGuild(client).id);

    if (!settings.guideChannelId) {
      return null;
    }

    const channel = await client.channels.fetch(settings.guideChannelId).catch(() => null);

    if (!channel?.isSendable() || !channel.isTextBased()) {
      return null;
    }

    const payload = {
      flags: MessageFlags.IsComponentsV2 as const,
      components: [TravelContainer.panel()],
      allowedMentions: { parse: [] },
    };

    const messages = await channel.messages.fetch({ limit: 50 });

    const existing = messages.find(
      (message) => message.author.id === client.user.id && this.isPanel(message),
    );

    if (existing) {
      return existing.edit(payload);
    }

    return channel.send(payload);
  }

  private static async checkRequirements(discordId: string, route: RouteWithTarget) {
    if (!(await TravelRepository.countAliveCharacters(discordId, false))) {
      throw new LocationError("Перемещаться может только игрок с живым персонажем.");
    }

    if (route.adultOnly && !(await TravelRepository.countAliveCharacters(discordId, true))) {
      throw new LocationError(`Путь «${route.method}» доступен только взрослым волшебникам.`);
    }

    if (!route.itemKey) {
      return null;
    }

    const item = await TravelRepository.findPayer(discordId, route.itemKey, route.itemQuantity);

    if (!item) {
      throw new LocationError(
        `Для пути «${route.method}» нужно **${LocationFormatter.item(route)}** в инвентаре одного из ваших персонажей.`,
      );
    }

    return {
      characterId: item.characterId,
      characterName: item.character.rpName,
      itemId: item.id,
    };
  }

  private static async requestApproval(member: GuildMember, plan: TravelPlan) {
    const settings = await LocationRepository.getSettings(member.guild.id);

    const channel = settings.requestChannelId
      ? await member.client.channels.fetch(settings.requestChannelId).catch(() => null)
      : null;

    if (!channel?.isSendable()) {
      throw new LocationError("Кураторы ещё не настроили канал для заявок. Обратитесь к администрации.");
    }

    const travel = await TravelRepository.createPending({
      guildId: member.guild.id,
      userId: member.id,
      fromId: plan.from?.id ?? null,
      toId: plan.route.toId,
      routeId: plan.route.id,
    });

    try {
      const message = await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [
          TravelContainer.request(travel, plan.route, plan.from, member.displayName, { status: "pending" }),
        ],
        allowedMentions: { parse: [] },
      });

      await TravelRepository.setRequestMessage(travel.id, message.id);
    } catch (error) {
      await TravelRepository.claim(travel.id);

      throw error;
    }
  }

  private static async depart(member: GuildMember, plan: TravelPlan, notify = false) {
    const { route } = plan;

    if (plan.payer) {
      await CharacterInventoryRepository.take(plan.payer.itemId, route.itemQuantity);
    }

    const spent = plan.payer
      ? ` Потрачено: ${LocationFormatter.item(route)} (${plan.payer.characterName}).`
      : "";

    if (route.travelMinutes <= 0) {
      await this.placeAt(member, route.to);
      await this.announceArrival(member, route.to, route.method);

      await this.log(
        member.guild,
        `<@${member.id}> переместился(ась): ${plan.from ? LocationFormatter.title(plan.from) : "—"} → **${LocationFormatter.title(route.to)}** · ${route.method}.${spent}`,
      );

      const result = TravelContainer.success(
        "Вы на месте",
        `Вы прибыли в **${LocationFormatter.title(route.to)}**.${spent}${this.sceneLink(route.to)}`,
      );

      if (notify) {
        await this.dm(member, result);
      }

      return result;
    }

    const arrivesAt = new Date(Date.now() + route.travelMinutes * 60_000);

    await TravelRepository.createTraveling({
      guildId: member.guild.id,
      userId: member.id,
      fromId: plan.from?.id ?? null,
      toId: route.toId,
      routeId: route.id,
      arrivesAt,
    });

    const locations = await LocationRepository.list(member.guild.id);
    const settings = await LocationRepository.getSettings(member.guild.id);

    await this.swapRoles(member, locations, settings.travelRoleId ? [settings.travelRoleId] : []);

    await this.log(
      member.guild,
      `<@${member.id}> отправился(ась) в путь: ${plan.from ? LocationFormatter.title(plan.from) : "—"} → **${LocationFormatter.title(route.to)}** · ${route.method}, прибытие <t:${Math.floor(arrivesAt.getTime() / 1000)}:R>.${spent}`,
    );

    const result = TravelContainer.success(
      "Вы в пути",
      `Вы направляетесь в **${LocationFormatter.title(route.to)}**. Прибытие <t:${Math.floor(arrivesAt.getTime() / 1000)}:R>.${spent}`,
    );

    if (notify) {
      await this.dm(member, result);
    }

    return result;
  }

  private static async arriveById(guild: Guild, travel: Travel) {
    const member = await guild.members.fetch(travel.userId).catch(() => null);

    const location = (await LocationRepository.list(guild.id)).find((entry) => entry.id === travel.toId);

    if (!member || !location) {
      return;
    }

    const route = await LocationRepository.getRoute(travel.routeId);

    await this.placeAt(member, location);
    await this.announceArrival(member, location, route?.method ?? "в пути");

    await this.log(guild, `<@${member.id}> прибыл(а) в **${LocationFormatter.title(location)}**.`);

    await this.dm(
      member,
      TravelContainer.success(
        "Вы на месте",
        `Вы прибыли в **${LocationFormatter.title(location)}**.${this.sceneLink(location)}`,
      ),
    );
  }

  private static async placeAt(member: GuildMember, location: Location) {
    const locations = await LocationRepository.list(member.guild.id);

    await this.swapRoles(member, locations, [location.roleId]);
  }

  private static async swapRoles(member: GuildMember, locations: Location[], add: string[]) {
    const settings = await LocationRepository.getSettings(member.guild.id);

    const managed = new Set([
      ...locations.map((location) => location.roleId),
      ...(settings.travelRoleId ? [settings.travelRoleId] : []),
    ]);

    const remove = [...managed].filter((roleId) => !add.includes(roleId) && member.roles.cache.has(roleId));

    if (remove.length) {
      await member.roles.remove(remove, "Перемещение между локациями");
    }

    const missing = add.filter((roleId) => !member.roles.cache.has(roleId));

    if (missing.length) {
      await member.roles.add(missing, "Перемещение между локациями");
    }
  }

  private static sceneLink(location: Location) {
    return location.arrivalChannelId ? `
-# Место отыгрыша: <#${location.arrivalChannelId}>` : "";
  }

  private static async announceArrival(member: GuildMember, location: Location, method: string) {
    if (!location.arrivalChannelId) {
      return;
    }

    const channel = await member.client.channels.fetch(location.arrivalChannelId).catch(() => null);

    if (channel?.isSendable()) {
      await channel
        .send({
          flags: MessageFlags.IsComponentsV2,
          components: [TravelContainer.arrival(member.id, location, method)],
          allowedMentions: { parse: [] },
        })
        .catch(() => null);
    }
  }

  private static async updateRequest(
    guild: Guild,
    travel: Travel,
    playerName: string,
    state: Parameters<typeof TravelContainer.request>[4],
  ) {
    if (!travel.requestMessageId) {
      return;
    }

    const [route, locations, settings] = await Promise.all([
      LocationRepository.getRoute(travel.routeId),
      LocationRepository.list(guild.id),
      LocationRepository.getSettings(guild.id),
    ]);

    if (!route || !settings.requestChannelId) {
      return;
    }

    const channel = await guild.client.channels.fetch(settings.requestChannelId).catch(() => null);

    if (!channel?.isTextBased()) {
      return;
    }

    const message = await channel.messages.fetch(travel.requestMessageId).catch(() => null);

    await message
      ?.edit({
        flags: MessageFlags.IsComponentsV2,
        components: [
          TravelContainer.request(
            travel,
            route,
            locations.find((entry) => entry.id === travel.fromId) ?? null,
            playerName,
            state,
          ),
        ],
        allowedMentions: { parse: [] },
      })
      .catch(() => null);
  }

  private static async log(guild: Guild, content: string) {
    const settings = await LocationRepository.getSettings(guild.id);

    if (!settings.logChannelId) {
      return;
    }

    const channel = await guild.client.channels.fetch(settings.logChannelId).catch(() => null);

    if (channel?.isSendable()) {
      await channel
        .send({
          flags: MessageFlags.IsComponentsV2,
          components: [TravelContainer.log(content)],
          allowedMentions: { parse: [] },
        })
        .catch(() => null);
    }
  }

  private static async dm(member: GuildMember, content: ContainerBuilder) {
    await member
      .send({ flags: MessageFlags.IsComponentsV2, components: [content] })
      .catch(() => null);
  }

  private static async assertCurator(interaction: BaseInteraction) {
    const subject = await PermissionService.resolveSubject(interaction);

    if (!(await PermissionService.canUse(subject, this.MANAGE_KEY))) {
      throw new LocationError("Решать заявки на перемещение могут только кураторы.");
    }
  }

  private static isUserError(error: Error) {
    return error.name === "LocationError" || error.name === "CharacterError";
  }

  private static isPanel(message: Message) {
    const customId = TravelCustomIds.build(TravelAction.Guide);

    return message.components.some((component) => this.hasCustomId(component, customId));
  }

  private static hasCustomId(component: TopLevelComponent | object, customId: string): boolean {
    const data = component as { customId?: string; components?: object[] };

    if (data.customId === customId) {
      return true;
    }

    return (data.components ?? []).some((child) => this.hasCustomId(child, customId));
  }
}
