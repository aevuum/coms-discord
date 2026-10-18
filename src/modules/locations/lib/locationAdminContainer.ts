import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  LabelBuilder,
  ModalBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import type { Location } from "../../../database/generated/prisma/client.js";

import { ManageComponents } from "../../manage/lib/manageComponents.js";
import type { RolePage } from "../../permissions/types/permissions.js";
import {
  SettingsField,
  type ChannelPage,
  type LocationWithRoutes,
  type SettingsView,
} from "../types/locations.js";
import {
  LocationAdminAction,
  LocationCustomIds,
  LocationModalFields,
} from "./locationCustomIds.js";
import { LocationFormatter } from "./locationFormatter.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const HEADER = "<:3124journeys:1518587239276478546>";
const PREV = "<:26204blackarrow:1518587278467792997>";
const NEXT = "<:48765whitearrow:1518587298281685173>";

const SETTINGS_LABELS: Record<SettingsField, { label: string; description: string }> = {
  [SettingsField.Request]: {
    label: "Канал заявок",
    description: "Куда приходят заявки на вход в особые места",
  },
  [SettingsField.Log]: {
    label: "Журнал перемещений",
    description: "Куда бот пишет, кто куда переместился",
  },
  [SettingsField.Guide]: {
    label: "Канал путеводителя",
    description: "Где висит постоянная кнопка «Открыть путеводитель»",
  },
  [SettingsField.TravelRole]: {
    label: "Роль «В пути»",
    description: "Выдаётся на время дороги, если путь занимает время",
  },
};

export class LocationAdminContainer {
  public static root(locations: LocationWithRoutes[], roleName: (roleId: string) => string) {
    const container = this.base("Локации", [
      `${ARROW} Локация — это роль, которая открывает игроку каналы места. Игроки перемещаются по путям между локациями через /travel.`,
      "-# Особые места пускают только с разрешения куратора.",
    ]);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        locations.length
          ? locations
              .map(
                (location) =>
                  `**${LocationFormatter.title(location)}** · \`@${roleName(location.roleId)}\`\n-# ${LocationFormatter.access(location)} · путей: ${location.routesFrom.length}`,
              )
              .join("\n")
          : `${ARROW} Локаций пока нет.`,
      ),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

    if (locations.length) {
      container.addActionRowComponents(
        this.locationSelect(
          LocationCustomIds.build(LocationAdminAction.View),
          "Выберите локацию для настройки",
          locations,
        ),
      );
    }

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(LocationCustomIds.build(LocationAdminAction.Add, "0"))
          .setLabel("Добавить")
          .setEmoji("<:6509addguild:1518587247769817088>")
          .setStyle(ButtonStyle.Success),
        ManageComponents.memberSearchButton(
          LocationCustomIds.build(LocationAdminAction.Move),
          "Переместить игрока",
        ),
        new ButtonBuilder()
          .setCustomId(LocationCustomIds.build(LocationAdminAction.Settings))
          .setLabel("Настройки")
          .setEmoji("<:479873settingsna:1518581042456432791>")
          .setStyle(ButtonStyle.Secondary),
        ManageComponents.homeButton(),
      ),
    );

    return container;
  }

  public static view(location: LocationWithRoutes, roleName: string, arrivalName: string | null) {
    const container = this.base(LocationFormatter.title(location), [
      location.description ? `> ${location.description}` : "-# Без описания.",
      `${ARROW} Роль: \`@${roleName}\``,
      `${ARROW} Доступ: ${LocationFormatter.access(location)}`,
      `${ARROW} Канал прибытия: ${arrivalName ? `\`#${arrivalName}\`` : "не задан"}`,
    ]);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "### Пути отсюда",
          location.routesFrom.length
            ? location.routesFrom.map((route) => LocationFormatter.routeLine(route)).join("\n")
            : "-# Путей пока нет — игроки не смогут уйти отсюда сами.",
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(LocationCustomIds.build(LocationAdminAction.Edit, location.id))
          .setLabel("Изменить")
          .setEmoji("<:984149edit:1518587370474176612>")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(LocationCustomIds.build(LocationAdminAction.ToggleAccess, location.id))
          .setLabel(location.access === "APPROVAL" ? "Сделать свободной" : "Только по разрешению")
          .setEmoji(location.access === "APPROVAL" ? "🔓" : "🔒")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(LocationCustomIds.build(LocationAdminAction.ArrivalPage, location.id, "0"))
          .setLabel("Канал прибытия")
          .setEmoji("<:7361media:1518587252672827412>")
          .setStyle(ButtonStyle.Secondary),
      ),
    );

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(LocationCustomIds.build(LocationAdminAction.RouteAdd, location.id))
          .setLabel("Добавить путь")
          .setEmoji("<:6509addguild:1518587247769817088>")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(LocationCustomIds.build(LocationAdminAction.RouteDelete, location.id))
          .setLabel("Удалить путь")
          .setEmoji("<:14605delete:1518587266505642074>")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(!location.routesFrom.length),
        new ButtonBuilder()
          .setCustomId(LocationCustomIds.build(LocationAdminAction.Delete, location.id))
          .setLabel("Удалить локацию")
          .setEmoji("<:14605delete:1518587266505642074>")
          .setStyle(ButtonStyle.Danger),
        this.backButton(),
      ),
    );

    return container;
  }

  public static rolePicker(rolePage: RolePage) {
    const container = this.base("Новая локация", [
      `${ARROW} Выберите роль, которая открывает каналы этой локации.`,
    ]);

    if (rolePage.roles.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(LocationCustomIds.build(LocationAdminAction.AddRole))
            .setPlaceholder(this.pagePlaceholder("Роль", rolePage.page, rolePage.totalPages))
            .addOptions(
              rolePage.roles.map((role) =>
                new StringSelectMenuOptionBuilder().setLabel(role.name.slice(0, 100)).setValue(role.id),
              ),
            ),
        ),
      );
    }

    container.addActionRowComponents(
      this.pager(
        rolePage.page,
        rolePage.totalPages,
        (page) => LocationCustomIds.build(LocationAdminAction.AddRolePage, String(page)),
        this.backButton(),
      ),
    );

    return container;
  }

  public static locationModal(customId: string, title: string, values: { name: string; emoji: string; description: string }) {
    return new ModalBuilder()
      .setCustomId(customId)
      .setTitle(title.slice(0, 45))
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Название")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(LocationModalFields.Name)
              .setStyle(TextInputStyle.Short)
              .setMinLength(2)
              .setMaxLength(40)
              .setRequired(true)
              .setValue(values.name.slice(0, 40)),
          ),
        new LabelBuilder()
          .setLabel("Эмодзи")
          .setDescription("Обычный эмодзи или эмодзи с сервера, можно оставить пустым")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(LocationModalFields.Emoji)
              .setStyle(TextInputStyle.Short)
              .setMaxLength(64)
              .setRequired(false)
              .setValue(values.emoji),
          ),
        new LabelBuilder()
          .setLabel("Описание")
          .setDescription("Что это за место — игроки увидят это в путеводителе")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(LocationModalFields.Description)
              .setStyle(TextInputStyle.Paragraph)
              .setMaxLength(300)
              .setRequired(false)
              .setValue(values.description),
          ),
      );
  }

  public static channelPicker(options: {
    title: string;
    description: string;
    page: ChannelPage;
    selectId: string;
    pageId: (page: number) => string;
    clearId: string | null;
    backId: string;
  }) {
    const container = this.base(options.title, [`${ARROW} ${options.description}`]);

    if (options.page.channels.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(options.selectId)
            .setPlaceholder(this.pagePlaceholder("Канал", options.page.page, options.page.totalPages))
            .addOptions(
              options.page.channels.map((channel) =>
                new StringSelectMenuOptionBuilder().setLabel(`#${channel.name}`.slice(0, 100)).setValue(channel.id),
              ),
            ),
        ),
      );
    }

    const extra: ButtonBuilder[] = [];

    if (options.clearId) {
      extra.push(
        new ButtonBuilder()
          .setCustomId(options.clearId)
          .setLabel("Убрать")
          .setEmoji("<:12138cross:1518587259669053591>")
          .setStyle(ButtonStyle.Danger),
      );
    }

    extra.push(this.backButton("Назад", options.backId));

    container.addActionRowComponents(
      this.pager(options.page.page, options.page.totalPages, options.pageId, ...extra),
    );

    return container;
  }

  public static travelRolePicker(rolePage: RolePage) {
    const container = this.base(SETTINGS_LABELS[SettingsField.TravelRole].label, [
      `${ARROW} ${SETTINGS_LABELS[SettingsField.TravelRole].description}.`,
    ]);

    if (rolePage.roles.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(LocationCustomIds.build(LocationAdminAction.SettingsSet, SettingsField.TravelRole))
            .setPlaceholder(this.pagePlaceholder("Роль", rolePage.page, rolePage.totalPages))
            .addOptions(
              rolePage.roles.map((role) =>
                new StringSelectMenuOptionBuilder().setLabel(role.name.slice(0, 100)).setValue(role.id),
              ),
            ),
        ),
      );
    }

    container.addActionRowComponents(
      this.pager(
        rolePage.page,
        rolePage.totalPages,
        (page) => LocationCustomIds.build(LocationAdminAction.SettingsPage, SettingsField.TravelRole, String(page)),
        new ButtonBuilder()
          .setCustomId(LocationCustomIds.build(LocationAdminAction.SettingsClear, SettingsField.TravelRole))
          .setLabel("Убрать")
          .setEmoji("<:12138cross:1518587259669053591>")
          .setStyle(ButtonStyle.Danger),
        this.backButton("Назад", LocationCustomIds.build(LocationAdminAction.Settings)),
      ),
    );

    return container;
  }

  public static settings(view: SettingsView) {
    const value = (name: string | null, prefix: string) => (name ? `\`${prefix}${name}\`` : "не задано");

    const container = this.base("Настройки перемещений", [
      `${ARROW} ${SETTINGS_LABELS[SettingsField.Request].label}: ${value(view.requestChannelName, "#")}`,
      `-# ${SETTINGS_LABELS[SettingsField.Request].description}. Без него в особые места попасть нельзя.`,
      `${ARROW} ${SETTINGS_LABELS[SettingsField.Log].label}: ${value(view.logChannelName, "#")}`,
      `${ARROW} ${SETTINGS_LABELS[SettingsField.Guide].label}: ${value(view.guideChannelName, "#")}`,
      `${ARROW} ${SETTINGS_LABELS[SettingsField.TravelRole].label}: ${value(view.travelRoleName, "@")}`,
      `-# ${SETTINGS_LABELS[SettingsField.TravelRole].description}.`,
    ]);

    container.addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(LocationCustomIds.build(LocationAdminAction.SettingsPick))
          .setPlaceholder("Что настроить")
          .addOptions(
            Object.values(SettingsField).map((field) =>
              new StringSelectMenuOptionBuilder()
                .setValue(field)
                .setLabel(SETTINGS_LABELS[field].label)
                .setDescription(SETTINGS_LABELS[field].description.slice(0, 100)),
            ),
          ),
      ),
    );

    container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(this.backButton()));

    return container;
  }

  public static settingsLabel(field: SettingsField) {
    return SETTINGS_LABELS[field];
  }

  public static routeTargets(location: Location, locations: Location[]) {
    const targets = locations.filter((entry) => entry.id !== location.id);

    const container = this.base(`Новый путь · ${LocationFormatter.title(location)}`, [
      targets.length
        ? `${ARROW} Куда ведёт путь?`
        : `${ARROW} Сначала добавьте ещё хотя бы одну локацию.`,
    ]);

    if (targets.length) {
      container.addActionRowComponents(
        this.locationSelect(
          LocationCustomIds.build(LocationAdminAction.RouteTarget, location.id),
          "Выберите локацию назначения",
          targets,
        ),
      );
    }

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        this.backButton("Назад", LocationCustomIds.build(LocationAdminAction.View, location.id)),
      ),
    );

    return container;
  }

  public static routeModal(from: Location, to: Location) {
    return new ModalBuilder()
      .setCustomId(LocationCustomIds.build(LocationAdminAction.RouteModal, from.id, to.id))
      .setTitle(`${from.name} → ${to.name}`.slice(0, 45))
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Способ")
          .setDescription("Например: Пешком, Камин, Аппарация, Портключ")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(LocationModalFields.Method)
              .setStyle(TextInputStyle.Short)
              .setMinLength(2)
              .setMaxLength(40)
              .setRequired(true)
              .setValue("Пешком"),
          ),
        new LabelBuilder()
          .setLabel("Время в пути, минут")
          .setDescription("0 — мгновенно")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(LocationModalFields.Minutes)
              .setStyle(TextInputStyle.Short)
              .setMaxLength(4)
              .setRequired(false)
              .setValue("0"),
          ),
        new LabelBuilder()
          .setLabel("Нужный предмет и количество")
          .setDescription("Название как в инвентаре персонажа, например «Летучий порох». Пусто — без предмета")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(LocationModalFields.ItemName)
              .setStyle(TextInputStyle.Short)
              .setMaxLength(80)
              .setRequired(false),
          ),
        new LabelBuilder()
          .setLabel("Сколько предметов тратится")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(LocationModalFields.ItemQuantity)
              .setStyle(TextInputStyle.Short)
              .setMaxLength(3)
              .setRequired(false)
              .setValue("1"),
          ),
        new LabelBuilder()
          .setLabel("Дополнительно")
          .setDescription("«Только взрослые» — например, для аппарации. Обратный путь получит те же условия")
          .setStringSelectMenuComponent(
            new StringSelectMenuBuilder()
              .setCustomId(LocationModalFields.Options)
              .setRequired(false)
              .setMinValues(0)
              .setMaxValues(2)
              .addOptions(
                new StringSelectMenuOptionBuilder().setLabel("Только взрослые").setValue("adult"),
                new StringSelectMenuOptionBuilder()
                  .setLabel("Создать обратный путь")
                  .setValue("reverse")
                  .setDefault(true),
              ),
          ),
      );
  }

  public static routeDeletePicker(location: LocationWithRoutes) {
    const container = this.base(`Удаление пути · ${LocationFormatter.title(location)}`, [
      `${ARROW} Выберите путь, который нужно удалить. Обратный путь останется.`,
    ]);

    container.addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(LocationCustomIds.build(LocationAdminAction.RouteRemove, location.id))
          .setPlaceholder("Выберите путь")
          .addOptions(
            location.routesFrom.slice(0, 25).map((route) =>
              new StringSelectMenuOptionBuilder()
                .setValue(route.id)
                .setLabel(`${route.to.name} · ${route.method}`.slice(0, 100))
                .setDescription(LocationFormatter.conditions(route).join(" · ").slice(0, 100))
                .setEmoji(LocationFormatter.selectEmoji(route.to.emoji)),
            ),
          ),
      ),
    );

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        this.backButton("Назад", LocationCustomIds.build(LocationAdminAction.View, location.id)),
      ),
    );

    return container;
  }

  public static deleteConfirm(location: Location) {
    const container = this.base("Удаление локации", [
      `${ARROW} Удалить **${LocationFormatter.title(location)}** вместе со всеми путями?`,
      "-# Роль на сервере останется, у игроков она тоже не снимется.",
    ]);

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(LocationCustomIds.build(LocationAdminAction.DeleteConfirm, location.id))
          .setLabel("Удалить")
          .setEmoji("<:14605delete:1518587266505642074>")
          .setStyle(ButtonStyle.Danger),
        this.backButton("Отмена", LocationCustomIds.build(LocationAdminAction.View, location.id)),
      ),
    );

    return container;
  }

  public static moveTargets(memberName: string, discordId: string, current: Location | null, locations: Location[]) {
    const container = this.base("Перемещение игрока", [
      `${ARROW} Игрок: **${memberName}**`,
      `${ARROW} Сейчас: ${current ? LocationFormatter.title(current) : "нигде"}`,
      "-# Игрок окажется в выбранной локации сразу, без условий и предметов. Его заявки и дорога отменятся.",
    ]);

    if (locations.length) {
      container.addActionRowComponents(
        this.locationSelect(
          LocationCustomIds.build(LocationAdminAction.MoveTarget, discordId),
          "Куда переместить",
          locations,
        ),
      );
    }

    container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(this.backButton()));

    return container;
  }

  public static result(title: string, message: string, backId = LocationCustomIds.build(LocationAdminAction.Root)) {
    const container = this.base(title, [`${ARROW} ${message}`]);

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(this.backButton("Назад", backId)),
    );

    return container;
  }

  private static locationSelect(customId: string, placeholder: string, locations: Location[]) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(placeholder)
        .addOptions(
          locations.slice(0, 25).map((location) =>
            new StringSelectMenuOptionBuilder()
              .setValue(location.id)
              .setLabel(location.name.slice(0, 100))
              .setDescription(LocationFormatter.access(location))
              .setEmoji(LocationFormatter.selectEmoji(location.emoji)),
          ),
        ),
    );
  }

  private static pager(page: number, totalPages: number, pageId: (page: number) => string, ...extra: ButtonBuilder[]) {
    const row = new ActionRowBuilder<ButtonBuilder>();

    if (totalPages > 1) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(pageId(page - 1))
          .setEmoji(PREV)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page <= 0),
        new ButtonBuilder()
          .setCustomId(pageId(page + 1))
          .setEmoji(NEXT)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page >= totalPages - 1),
      );
    }

    row.addComponents(...extra);

    return row;
  }

  private static pagePlaceholder(label: string, page: number, totalPages: number) {
    return totalPages > 1 ? `${label} · страница ${page + 1} из ${totalPages}` : `Выберите: ${label.toLowerCase()}`;
  }

  private static backButton(label = "Назад", customId = LocationCustomIds.build(LocationAdminAction.Root)) {
    return new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setEmoji("<:172852arrowleft:1518587345249763452>")
      .setStyle(ButtonStyle.Secondary);
  }

  private static base(title: string, lines: string[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent([`# ${HEADER} ${title}`, "", ...lines].join("\n")),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

    return container;
  }
}
