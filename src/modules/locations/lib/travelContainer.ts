import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
} from "discord.js";

import type { Location, Travel } from "../../../database/generated/prisma/client.js";

import type { GuideView, RouteWithTarget, TravelPlan } from "../types/locations.js";
import { TravelAction, TravelCustomIds } from "./locationCustomIds.js";
import { LocationFormatter } from "./locationFormatter.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const MAP = "<:3124journeys:1518587239276478546>";
const SUCCESS = "<:312537mark:1518581040548024430>";
const ERROR = "<:240191mark:1518581039172292688>";
const WAIT = "<a:38899greenloading:1518587295354064956>";

export class TravelContainer {
  public static guide(view: GuideView) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [`# ${MAP} Путеводитель`, "", ...this.currentBlock(view)].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    if (view.travel) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(this.travelBlock(view.travel)),
      );
    } else if (view.current) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            "### Куда можно отправиться",
            view.routes.length
              ? view.routes.map((route) => LocationFormatter.routeLine(route)).join("\n")
              : "-# Отсюда пока никуда не ведут дороги.",
          ].join("\n"),
        ),
      );
    }

    const elsewhere = view.locations.filter(
      (location) =>
        location.id !== view.current?.id &&
        !view.routes.some((route) => route.toId === location.id),
    );

    if (elsewhere.length) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            "### Другие места",
            elsewhere.map((location) => `${ARROW} ${LocationFormatter.title(location)}`).join("\n"),
            "-# Прямого пути отсюда нет — доберитесь через соседние локации.",
          ].join("\n"),
        ),
      );
    }

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    if (!view.travel && view.current && view.routes.length) {
      container.addActionRowComponents(this.routeSelect(view.routes));
    }

    const buttons = new ActionRowBuilder<ButtonBuilder>();

    if (view.travel?.status === "PENDING") {
      buttons.addComponents(
        new ButtonBuilder()
          .setCustomId(TravelCustomIds.build(TravelAction.Cancel))
          .setLabel("Отменить заявку")
          .setEmoji("<:12138cross:1518587259669053591>")
          .setStyle(ButtonStyle.Danger),
      );
    }

    buttons.addComponents(
      new ButtonBuilder()
        .setCustomId(TravelCustomIds.build(TravelAction.Guide))
        .setLabel("Обновить")
        .setEmoji("<:5794update:1518587244384882689>")
        .setStyle(ButtonStyle.Secondary),
    );

    container.addActionRowComponents(buttons);

    return container;
  }

  public static panel() {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${MAP} Путеводитель`,
          "",
          `${ARROW} Здесь можно узнать, где находится ваш персонаж, какие места есть в мире и как до них добраться.`,
          `${ARROW} Пешком можно дойти куда угодно. А вот аппарировать или переместиться камином в особые места (например, Хогвартс или Министерство) можно только с разрешения куратора.`,
          `${ARROW} Для некоторых путей нужны предметы из инвентаря персонажа — например, летучий порох для камина.`,
          "-# Путеводитель также открывается командой /travel.",
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(TravelCustomIds.build(TravelAction.Guide))
          .setLabel("Открыть путеводитель")
          .setEmoji(MAP)
          .setStyle(ButtonStyle.Primary),
      ),
    );

    return container;
  }

  public static confirm(plan: TravelPlan) {
    const { route } = plan;

    const lines = [
      `# ${MAP} ${LocationFormatter.title(route.to)}`,
      "",
      route.to.description ? `> ${route.to.description}` : null,
      `${ARROW} Путь: **${route.method}** · ${LocationFormatter.duration(route.travelMinutes)}`,
      plan.payer
        ? `${ARROW} Будет потрачено: **${LocationFormatter.item(route)}** у персонажа **${plan.payer.characterName}**`
        : null,
      LocationFormatter.needsApproval(route)
        ? `${ARROW} Это особое место: попасть сюда магией можно только с разрешения куратора. Заявка уйдёт кураторам, предмет спишется после одобрения.`
        : null,
      route.travelMinutes > 0
        ? "-# В пути вы не будете видеть ни одну локацию."
        : null,
    ].filter((line): line is string => line !== null);

    const container = new ContainerBuilder().setAccentColor(0x475b56)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")));

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(TravelCustomIds.build(TravelAction.Confirm, route.id))
          .setLabel(LocationFormatter.needsApproval(route) ? "Отправить заявку" : "Отправиться")
          .setEmoji("<:83888settingsanimation:1518587313817653329>")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(TravelCustomIds.build(TravelAction.Guide))
          .setLabel("Назад")
          .setEmoji("<:172852arrowleft:1518587345249763452>")
          .setStyle(ButtonStyle.Secondary),
      ),
    );

    return container;
  }

  public static request(
    travel: Pick<Travel, "id" | "userId">,
    route: RouteWithTarget,
    from: Location | null,
    playerName: string,
    state: { status: "pending" } | { status: "approved" | "rejected" | "cancelled" | "failed"; by?: string; reason?: string },
  ) {
    const resolved = state.status !== "pending";

    const statusLine = {
      pending: `${WAIT} Ожидает решения куратора`,
      approved: `${SUCCESS} Одобрено${"by" in state && state.by ? ` · <@${state.by}>` : ""}`,
      rejected: `${ERROR} Отклонено${"by" in state && state.by ? ` · <@${state.by}>` : ""}`,
      cancelled: `${ERROR} Отменено игроком`,
      failed: `${ERROR} Не удалось: ${"reason" in state ? state.reason : ""}`,
    }[state.status];

    const container = new ContainerBuilder().setAccentColor(0x475b56)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            `# ${MAP} Заявка на перемещение`,
            "",
            `${ARROW} Игрок: <@${travel.userId}> (**${playerName}**)`,
            `${ARROW} Откуда: ${from ? LocationFormatter.title(from) : "—"}`,
            `${ARROW} Куда: **${LocationFormatter.title(route.to)}**`,
            `${ARROW} Путь: ${route.method} · ${LocationFormatter.conditions(route).join(" · ")}`,
            "",
            statusLine,
          ].join("\n"),
        ),
      );

    if (!resolved) {
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      container.addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(TravelCustomIds.build(TravelAction.Approve, travel.id))
            .setLabel("Разрешить")
            .setEmoji("<:84305verifiedgreen:1518587318926049290>")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(TravelCustomIds.build(TravelAction.Reject, travel.id))
            .setLabel("Отказать")
            .setEmoji("<:12138cross:1518587259669053591>")
            .setStyle(ButtonStyle.Danger),
        ),
      );
    }

    return container;
  }

  public static arrival(userId: string, location: Location, method: string) {
    return this.notice(
      `${LocationFormatter.title(location)}`,
      `<@${userId}> прибывает сюда · ${method}.`,
    );
  }

  public static log(content: string) {
    return new ContainerBuilder().setAccentColor(0x475b56)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${MAP} ${content}`));
  }

  public static success(title: string, message: string) {
    return this.notice(`${SUCCESS} ${title}`, message);
  }

  public static error(message: string) {
    return this.notice(`${ERROR} Ошибка`, message);
  }

  public static notice(title: string, message: string) {
    return new ContainerBuilder().setAccentColor(0x475b56)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([`## ${title}`, `${ARROW} ${message}`].join("\n")),
      );
  }

  private static currentBlock(view: GuideView) {
    if (view.travel?.status === "TRAVELING") {
      return [`${ARROW} Вы в пути и пока не находитесь ни в одной локации.`];
    }

    if (!view.current) {
      return [
        `${ARROW} Вы пока не находитесь ни в одной локации.`,
        "-# Стартовую локацию назначает куратор.",
      ];
    }

    return [
      `${ARROW} Вы находитесь: **${LocationFormatter.title(view.current)}**`,
      view.current.description ? `> ${view.current.description}` : null,
    ].filter((line): line is string => line !== null);
  }

  private static travelBlock(travel: NonNullable<GuideView["travel"]>) {
    const target = travel.to ? `**${LocationFormatter.title(travel.to)}**` : "неизвестное место";

    if (travel.status === "PENDING") {
      return [
        `### ${WAIT} Заявка на рассмотрении`,
        `${ARROW} Вы попросили разрешения отправиться в ${target}. Кураторы скоро ответят.`,
      ].join("\n");
    }

    const arrives = Math.floor((travel.arrivesAt?.getTime() ?? Date.now()) / 1000);

    return [
      `### ${WAIT} В пути`,
      `${ARROW} Вы направляетесь в ${target}. Прибытие <t:${arrives}:R>.`,
    ].join("\n");
  }

  private static routeSelect(routes: RouteWithTarget[]) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(TravelCustomIds.build(TravelAction.Route))
        .setPlaceholder("Куда отправиться")
        .addOptions(
          routes.slice(0, 25).map((route) =>
            new StringSelectMenuOptionBuilder()
              .setValue(route.id)
              .setLabel(`${route.to.name} · ${route.method}`.slice(0, 100))
              .setDescription(LocationFormatter.conditions(route).join(" · ").slice(0, 100))
              .setEmoji(LocationFormatter.selectEmoji(route.to.emoji)),
          ),
        ),
    );
  }
}
