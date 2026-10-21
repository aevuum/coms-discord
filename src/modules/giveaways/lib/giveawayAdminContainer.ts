import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  FileUploadBuilder,
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

import type { Giveaway, GiveawaySettings } from "../../../database/generated/prisma/client.js";

import { ManageComponents } from "../../manage/lib/manageComponents.js";
import type { RolePage } from "../../permissions/types/permissions.js";
import { GiveawayAdminAction, GiveawayCustomIds, GiveawayModalFields } from "./giveawayCustomIds.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const HEADER = "<:sec_giveaway:1562521778125799554>";
const PREV = "<:26204blackarrow:1518587278467792997>";
const NEXT = "<:48765whitearrow:1518587298281685173>";

const STATUS = {
  ACTIVE: "<:dot_green:1562262861374423044>",
  ENDED: "🏁",
  CANCELLED: "🚫",
};

type ChannelPage = {
  channels: { id: string; name: string }[];
  page: number;
  totalPages: number;
};

export class GiveawayAdminContainer {
  public static root(
    active: Giveaway[],
    finished: Giveaway[],
    counts: Map<string, number>,
    settings: GiveawaySettings | null,
    channelName: string | null,
  ) {
    const container = this.base("Розыгрыши", [
      `${ARROW} Канал: ${channelName ? `\`#${channelName}\`` : "не выбран — укажите его в настройках"}`,
      "",
      "### Идут сейчас",
      active.length
        ? active.map((giveaway) => this.line(giveaway, counts)).join("\n")
        : "-# Активных розыгрышей нет.",
      "",
      "### Недавние",
      finished.length
        ? finished.map((giveaway) => this.line(giveaway, counts)).join("\n")
        : "-# Пока пусто.",
    ]);

    const all = [...active, ...finished];

    if (all.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(GiveawayCustomIds.admin(GiveawayAdminAction.View))
            .setPlaceholder("Выберите розыгрыш")
            .addOptions(
              all.slice(0, 25).map((giveaway) =>
                new StringSelectMenuOptionBuilder()
                  .setValue(giveaway.id)
                  .setLabel(giveaway.prize.slice(0, 100))
                  .setEmoji(STATUS[giveaway.status])
                  .setDescription(`Участников: ${counts.get(giveaway.id) ?? 0} · победителей: ${giveaway.winnerCount}`),
              ),
            ),
        ),
      );
    }

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(GiveawayCustomIds.admin(GiveawayAdminAction.Create))
          .setLabel("Создать розыгрыш")
          .setEmoji("<:6509addguild:1518587247769817088>")
          .setStyle(ButtonStyle.Success)
          .setDisabled(!settings?.channelId),
        new ButtonBuilder()
          .setCustomId(GiveawayCustomIds.admin(GiveawayAdminAction.Settings))
          .setLabel("Настройки")
          .setEmoji("<:settings_gear:1562262876545093695>")
          .setStyle(ButtonStyle.Secondary),
        ManageComponents.homeButton(),
      ),
    );

    return container;
  }

  public static view(giveaway: Giveaway, entries: number, messageUrl: string | null) {
    const endsAt = Math.floor(giveaway.endsAt.getTime() / 1000);

    const container = this.base(giveaway.prize, [
      giveaway.description ? `> ${giveaway.description.split("\n").join("\n> ")}` : "-# Без описания.",
      `${ARROW} Статус: ${STATUS[giveaway.status]} ${
        giveaway.status === "ACTIVE" ? "идёт" : giveaway.status === "ENDED" ? "завершён" : "отменён"
      }`,
      `${ARROW} Победителей: **${giveaway.winnerCount}** · участников: **${entries}**`,
      giveaway.status === "ACTIVE"
        ? `${ARROW} Итоги <t:${endsAt}:R> (<t:${endsAt}:f>)`
        : `${ARROW} Закончен <t:${Math.floor((giveaway.endedAt ?? giveaway.endsAt).getTime() / 1000)}:f>`,
      giveaway.status === "ENDED"
        ? `${ARROW} Победители: ${giveaway.winnerIds.length ? giveaway.winnerIds.map((id) => `<@${id}>`).join(", ") : "нет"}`
        : null,
      `${ARROW} Изображение: ${giveaway.imagePath ? "есть" : "нет"}`,
      `-# Организатор: <@${giveaway.hostId}>`,
    ]);

    const buttons: ButtonBuilder[] = [];

    if (messageUrl) {
      buttons.push(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("К сообщению").setURL(messageUrl));
    }

    if (giveaway.status === "ACTIVE") {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(GiveawayCustomIds.admin(GiveawayAdminAction.End, giveaway.id))
          .setLabel("Завершить сейчас")
          .setEmoji("🏁")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(GiveawayCustomIds.admin(GiveawayAdminAction.Cancel, giveaway.id))
          .setLabel("Отменить")
          .setEmoji("<:12138cross:1518587259669053591>")
          .setStyle(ButtonStyle.Danger),
      );
    }

    if (giveaway.status === "ENDED") {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(GiveawayCustomIds.admin(GiveawayAdminAction.Reroll, giveaway.id))
          .setLabel("Перевыбрать победителей")
          .setEmoji("🎲")
          .setStyle(ButtonStyle.Primary),
      );
    }

    buttons.push(this.backButton(GiveawayCustomIds.admin(GiveawayAdminAction.Root)));

    container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons));

    return container;
  }

  public static cancelConfirm(giveaway: Giveaway) {
    const container = this.base("Отмена розыгрыша", [
      `${ARROW} Отменить розыгрыш **${giveaway.prize}**? Победители выбраны не будут, сообщение в канале пометится как отменённое.`,
    ]);

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(GiveawayCustomIds.admin(GiveawayAdminAction.CancelConfirm, giveaway.id))
          .setLabel("Отменить розыгрыш")
          .setStyle(ButtonStyle.Danger),
        this.backButton(GiveawayCustomIds.admin(GiveawayAdminAction.View, giveaway.id), "Не отменять"),
      ),
    );

    return container;
  }

  public static createModal() {
    return new ModalBuilder()
      .setCustomId(GiveawayCustomIds.admin(GiveawayAdminAction.CreateModal))
      .setTitle("Новый розыгрыш")
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Что разыгрывается")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(GiveawayModalFields.Prize)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(200)
              .setPlaceholder("Например: 500 комс-коинов"),
          ),
        new LabelBuilder()
          .setLabel("Описание")
          .setDescription("Условия, подробности приза — необязательно")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(GiveawayModalFields.Description)
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(false)
              .setMaxLength(1500),
          ),
        new LabelBuilder()
          .setLabel("Сколько человек выиграет")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(GiveawayModalFields.Winners)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(2)
              .setValue("1"),
          ),
        new LabelBuilder()
          .setLabel("Длительность")
          .setDescription("Например: 30м, 2ч, 1д 12ч, 1нед. До 60 дней")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(GiveawayModalFields.Duration)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(30)
              .setPlaceholder("1д"),
          ),
        new LabelBuilder()
          .setLabel("Изображение")
          .setDescription("PNG, JPG, GIF или WEBP до 8 МБ — необязательно")
          .setFileUploadComponent(
            new FileUploadBuilder()
              .setCustomId(GiveawayModalFields.Image)
              .setMinValues(0)
              .setMaxValues(1)
              .setRequired(false),
          ),
      );
  }

  public static settings(settings: GiveawaySettings | null, channelName: string | null, roleName: string | null) {
    const container = this.base("Настройки розыгрышей", [
      `${ARROW} Канал: ${channelName ? `\`#${channelName}\`` : "не выбран"}`,
      `${ARROW} Роль для упоминания: ${roleName ? `\`@${roleName}\`` : "не выбрана — розыгрыши публикуются без пинга"}`,
    ]);

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(GiveawayCustomIds.admin(GiveawayAdminAction.ChannelPage, 0))
          .setLabel("Канал")
          .setEmoji("<:7361media:1518587252672827412>")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(GiveawayCustomIds.admin(GiveawayAdminAction.RolePage, 0))
          .setLabel("Роль для упоминания")
          .setEmoji("<:megaphone:1562262885944655882>")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(GiveawayCustomIds.admin(GiveawayAdminAction.RoleClear))
          .setLabel("Без упоминания")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(!settings?.pingRoleId),
        this.backButton(GiveawayCustomIds.admin(GiveawayAdminAction.Root)),
      ),
    );

    return container;
  }

  public static channelPicker(page: ChannelPage) {
    const container = this.base("Канал для розыгрышей", [
      `${ARROW} Сюда бот будет публиковать новые розыгрыши и итоги.`,
    ]);

    if (page.channels.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(GiveawayCustomIds.admin(GiveawayAdminAction.ChannelSet))
            .setPlaceholder(this.placeholder("Канал", page.page, page.totalPages))
            .addOptions(
              page.channels.map((channel) =>
                new StringSelectMenuOptionBuilder().setLabel(`#${channel.name}`.slice(0, 100)).setValue(channel.id),
              ),
            ),
        ),
      );
    }

    container.addActionRowComponents(
      this.pager(page.page, page.totalPages, GiveawayAdminAction.ChannelPage),
    );

    return container;
  }

  public static rolePicker(page: RolePage) {
    const container = this.base("Роль для упоминания", [
      `${ARROW} Эту роль бот упомянет при публикации нового розыгрыша.`,
    ]);

    if (page.roles.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(GiveawayCustomIds.admin(GiveawayAdminAction.RoleSet))
            .setPlaceholder(this.placeholder("Роль", page.page, page.totalPages))
            .addOptions(
              page.roles.map((role) =>
                new StringSelectMenuOptionBuilder().setLabel(role.name.slice(0, 100)).setValue(role.id),
              ),
            ),
        ),
      );
    }

    container.addActionRowComponents(this.pager(page.page, page.totalPages, GiveawayAdminAction.RolePage));

    return container;
  }

  private static line(giveaway: Giveaway, counts: Map<string, number>) {
    const time =
      giveaway.status === "ACTIVE"
        ? `итоги <t:${Math.floor(giveaway.endsAt.getTime() / 1000)}:R>`
        : giveaway.status === "ENDED"
          ? "завершён"
          : "отменён";

    return `${STATUS[giveaway.status]} **${giveaway.prize}** · ${counts.get(giveaway.id) ?? 0} уч. · ${time}`;
  }

  private static placeholder(label: string, page: number, totalPages: number) {
    return totalPages > 1 ? `${label} · страница ${page + 1} из ${totalPages}` : label;
  }

  private static pager(page: number, totalPages: number, action: GiveawayAdminAction) {
    const row = new ActionRowBuilder<ButtonBuilder>();

    if (totalPages > 1) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(GiveawayCustomIds.admin(action, page - 1))
          .setEmoji(PREV)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page <= 0),
        new ButtonBuilder()
          .setCustomId(GiveawayCustomIds.admin(action, page + 1))
          .setEmoji(NEXT)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page >= totalPages - 1),
      );
    }

    row.addComponents(this.backButton(GiveawayCustomIds.admin(GiveawayAdminAction.Settings)));

    return row;
  }

  private static backButton(customId: string, label = "Назад") {
    return new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setEmoji("<:172852arrowleft:1518587345249763452>")
      .setStyle(ButtonStyle.Secondary);
  }

  private static base(title: string, lines: (string | null)[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [`# ${HEADER} ${title}`, "", ...lines.filter((line) => line !== null)].join("\n"),
      ),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

    return container;
  }
}
