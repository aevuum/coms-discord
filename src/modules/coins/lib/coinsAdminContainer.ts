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

import type { CoinTransaction } from "../../../database/generated/prisma/client.js";

import { ManageComponents } from "../../manage/lib/manageComponents.js";
import type { RolePage } from "../../permissions/types/permissions.js";
import type { StipendView } from "../types/coins.js";
import { CoinFormatter, COINS_EMOJI } from "./coinFormatter.js";
import {
  CoinsAdminAction,
  CoinsCustomIds,
  CoinsModalFields,
} from "./coinsCustomIds.js";
import { StipendSchedule } from "./stipendSchedule.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";

export class CoinsAdminContainer {
  public static root(stipends: StipendView[]) {
    const next = Math.floor(StipendSchedule.nextPayout().getTime() / 1000);

    const container = this.base("Комс-коины", [
      `${ARROW} Еженедельные начисления по ролям: ${StipendSchedule.LABEL}.`,
      `${ARROW} Следующее начисление: <t:${next}:F> (<t:${next}:R>)`,
      "-# Новое начисление сработает в ближайший понедельник.",
    ]);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        stipends.length
          ? stipends
              .map(
                (stipend) =>
                  `${ARROW} \`@${stipend.roleName}\` — ${CoinFormatter.amount(stipend.amount)} в неделю`,
              )
              .join("\n")
          : `${ARROW} Начислений пока нет.`,
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    if (stipends.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(CoinsCustomIds.build(CoinsAdminAction.Stipend))
            .setPlaceholder("Выберите начисление для настройки")
            .addOptions(
              stipends.slice(0, 25).map((stipend) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(`@${stipend.roleName}`.slice(0, 100))
                  .setDescription(`${stipend.amount} комс-коинов в неделю`)
                  .setValue(stipend.id),
              ),
            ),
        ),
      );
    }

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(CoinsCustomIds.build(CoinsAdminAction.Add, "0"))
          .setLabel("Добавить начисление")
          .setEmoji("<:6509addguild:1518587247769817088>")
          .setStyle(ButtonStyle.Success),

        ManageComponents.memberSearchButton(
          CoinsCustomIds.build(CoinsAdminAction.Balance),
          "Баланс игрока",
        ),

        new ButtonBuilder()
          .setCustomId(CoinsCustomIds.build(CoinsAdminAction.Activity))
          .setLabel("Награды за активность")
          .setEmoji("<:835596rank:1518581047636525086>")
          .setStyle(ButtonStyle.Secondary),

        ManageComponents.homeButton(),
      ),
    );

    return container;
  }

  public static rolePicker(rolePage: RolePage) {
    const container = this.base("Новое начисление", [
      `${ARROW} Выберите роль, участникам которой будут начисляться комс-коины.`,
    ]);

    if (rolePage.roles.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(
              CoinsCustomIds.build(CoinsAdminAction.Role, String(rolePage.page)),
            )
            .setPlaceholder(
              rolePage.totalPages > 1
                ? `Роль · страница ${rolePage.page + 1} из ${rolePage.totalPages}`
                : "Выберите роль",
            )
            .addOptions(
              rolePage.roles.map((role) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(role.name.slice(0, 100))
                  .setValue(role.id),
              ),
            ),
        ),
      );
    }

    const row = new ActionRowBuilder<ButtonBuilder>();

    if (rolePage.totalPages > 1) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(
            CoinsCustomIds.build(CoinsAdminAction.RolePage, String(rolePage.page - 1)),
          )
          .setEmoji("<:26204blackarrow:1518587278467792997>")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(rolePage.page <= 0),

        new ButtonBuilder()
          .setCustomId(
            CoinsCustomIds.build(CoinsAdminAction.RolePage, String(rolePage.page + 1)),
          )
          .setEmoji("<:48765whitearrow:1518587298281685173>")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(rolePage.page >= rolePage.totalPages - 1),
      );
    }

    row.addComponents(this.backButton());

    container.addActionRowComponents(row);

    return container;
  }

  public static stipend(stipend: StipendView) {
    const container = this.base(`Начисление · @${stipend.roleName}`, [
      `${ARROW} Сумма: ${CoinFormatter.amount(stipend.amount)} в неделю`,
      `${ARROW} Последнее начисление: ${
        stipend.lastPaidAt
          ? `<t:${Math.floor(stipend.lastPaidAt.getTime() / 1000)}:f>`
          : "ещё не было"
      }`,
    ]);

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(CoinsCustomIds.build(CoinsAdminAction.Edit, stipend.roleId))
          .setLabel("Изменить сумму")
          .setEmoji("<:479873settingsna:1518581042456432791>")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId(CoinsCustomIds.build(CoinsAdminAction.Delete, stipend.id))
          .setLabel("Удалить")
          .setEmoji("<:14605delete:1518587266505642074>")
          .setStyle(ButtonStyle.Danger),

        this.backButton(),
      ),
    );

    return container;
  }

  public static deleteConfirm(stipend: StipendView) {
    const container = this.base("Удаление начисления", [
      `${ARROW} Перестать начислять ${CoinFormatter.amount(stipend.amount)} роли \`@${stipend.roleName}\`?`,
    ]);

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(CoinsCustomIds.build(CoinsAdminAction.DeleteConfirm, stipend.id))
          .setLabel("Удалить")
          .setEmoji("<:14605delete:1518587266505642074>")
          .setStyle(ButtonStyle.Danger),

        this.backButton("Отмена"),
      ),
    );

    return container;
  }

  public static player(
    memberName: string,
    discordId: string,
    balance: number,
    history: CoinTransaction[],
    notice?: string,
  ) {
    const container = this.base(`Баланс · ${memberName}`, [
      notice ? `<:312537mark:1518581040548024430> ${notice}` : null,
      `${ARROW} Баланс: ${CoinFormatter.amount(balance)}`,
    ]);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "### <:988044dots:1518581053642772621> Последние операции",
          history.length
            ? history
                .map(
                  (entry) =>
                    `${CoinFormatter.signed(entry.amount)} · ${CoinFormatter.transactionLabel(entry.type)} · <t:${Math.floor(entry.createdAt.getTime() / 1000)}:R>${
                      entry.reason ? `\n-# ${entry.reason}` : ""
                    }`,
                )
                .join("\n")
            : "-# Операций пока нет.",
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(CoinsCustomIds.build(CoinsAdminAction.Adjust, "add", discordId))
          .setLabel("Начислить")
          .setEmoji(COINS_EMOJI)
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(CoinsCustomIds.build(CoinsAdminAction.Adjust, "remove", discordId))
          .setLabel("Списать")
          .setEmoji("<:12138cross:1518587259669053591>")
          .setStyle(ButtonStyle.Danger),

        this.backButton(),
        ManageComponents.homeButton(),
      ),
    );

    return container;
  }

  public static activity(rewards: [number, number, number]) {
    const next = Math.floor(StipendSchedule.nextPayout().getTime() / 1000);

    const container = this.base("Награды за активность", [
      `${ARROW} Тройка самых активных игроков недели (/top) получает комс-коины, после чего рейтинг обнуляется.`,
      `${ARROW} Очки: 1 сообщение = 1 очко, 1 минута в голосовом = 1 очко.`,
      `${ARROW} Подведение итогов: ${StipendSchedule.LABEL}, ближайшее <t:${next}:R>.`,
      "",
      ...["🥇 1 место", "🥈 2 место", "🥉 3 место"].map(
        (label, index) =>
          `${label}: ${rewards[index] > 0 ? CoinFormatter.amount(rewards[index]) : "без награды"}`,
      ),
    ]);

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(CoinsCustomIds.build(CoinsAdminAction.ActivityEdit))
          .setLabel("Изменить награды")
          .setEmoji("<:479873settingsna:1518581042456432791>")
          .setStyle(ButtonStyle.Primary),

        this.backButton(),
      ),
    );

    return container;
  }

  public static activityModal(rewards: [number, number, number]) {
    const field = (customId: string, label: string, value: number) =>
      new LabelBuilder()
        .setLabel(label)
        .setDescription("Комс-коины. Пусто или 0 — без награды")
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(customId)
            .setStyle(TextInputStyle.Short)
            .setRequired(false)
            .setMaxLength(7)
            .setValue(String(value)),
        );

    return new ModalBuilder()
      .setCustomId(CoinsCustomIds.build(CoinsAdminAction.ActivityModal))
      .setTitle("Награды за активность")
      .addLabelComponents(
        field(CoinsModalFields.First, "1 место", rewards[0]),
        field(CoinsModalFields.Second, "2 место", rewards[1]),
        field(CoinsModalFields.Third, "3 место", rewards[2]),
      );
  }

  public static amountModal(roleId: string) {
    const input = new TextInputBuilder()
      .setCustomId(CoinsModalFields.Amount)
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(7)
      .setPlaceholder("100");

    return new ModalBuilder()
      .setCustomId(CoinsCustomIds.build(CoinsAdminAction.AmountModal, roleId))
      .setTitle("Еженедельное начисление")
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Комс-коинов в неделю")
          .setTextInputComponent(input),
      );
  }

  public static adjustModal(mode: "add" | "remove", discordId: string) {
    return new ModalBuilder()
      .setCustomId(CoinsCustomIds.build(CoinsAdminAction.AdjustModal, mode, discordId))
      .setTitle(mode === "add" ? "Начисление комс-коинов" : "Списание комс-коинов")
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Сумма")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(CoinsModalFields.Amount)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(7),
          ),
        new LabelBuilder()
          .setLabel("Причина")
          .setDescription("Будет видна в истории операций")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(CoinsModalFields.Reason)
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setMaxLength(200),
          ),
      );
  }

  private static base(title: string, lines: (string | null)[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [`# ${COINS_EMOJI} ${title}`, "", ...lines.filter((line) => line !== null)].join(
          "\n",
        ),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    return container;
  }

  private static backButton(label = "Назад") {
    return new ButtonBuilder()
      .setCustomId(CoinsCustomIds.build(CoinsAdminAction.Root))
      .setLabel(label)
      .setEmoji("<:26204blackarrow:1518587278467792997>")
      .setStyle(ButtonStyle.Secondary);
  }
}
