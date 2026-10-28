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

import type { HousePointsLog, HousePointsSettings } from "../../../database/generated/prisma/client.js";

import { ManageComponents } from "../../manage/lib/manageComponents.js";
import { ChannelField, SETTINGS_CHANNEL_TYPES } from "../../schedule/lib/channelField.js";
import { HOUSE_EMOJIS, HOUSE_LABELS, HOUSES, POINTS_MAX_DELTA, type House } from "../types/points.js";

export const POINTS_PREFIX = "hpoints";
export const POINTS_HEADER = "<:sec_rewards:1562521791329468467>";

export enum PointsAction {
  Root = "root",
  Adjust = "adjust",
  AdjustModal = "adjust_modal",
  Channel = "channel",
  ChannelModal = "channel_modal",
  Reset = "reset",
  ResetConfirm = "reset_confirm",
}

export const PointsFields = {
  House: "house",
  Amount: "amount",
  Note: "note",
  Channel: "channel",
} as const;

const SOURCE_LABELS: Record<string, string> = {
  MESSAGE: "сообщение",
  TUPPER: "туппер",
  MANUAL: "вручную",
};

const SUCCESS = "<:312537mark:1518581040548024430>";
const ARROW = "<:48765whitearrow:1518587298281685173>";

export class PointsAdminContainer {
  public static customId(action: PointsAction) {
    return `${POINTS_PREFIX}:${action}`;
  }

  public static parse(customId: string) {
    const [prefix, action] = customId.split(":");

    return prefix === POINTS_PREFIX && Object.values(PointsAction).includes(action as PointsAction) ? (action as PointsAction) : null;
  }

  public static root(
    totals: { faculty: House; points: number }[],
    recent: HousePointsLog[],
    settings: HousePointsSettings | null,
    notice: string | null = null,
  ) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);
    const sorted = [...totals].sort((left, right) => right.points - left.points);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${POINTS_HEADER} Очки факультетов`,
          notice ? `${SUCCESS} ${notice}` : null,
          "",
          ...sorted.map((entry, index) => `${HOUSE_EMOJIS[entry.faculty]} **${entry.points}** · ${HOUSE_LABELS[entry.faculty]}${index === 0 && entry.points > 0 ? " · лидирует" : ""}`),
          "",
          `${ARROW} Часы: ${settings?.channelId ? `<#${settings.channelId}>` : "канал не выбран"}`,
          "-# Начисляют кураторы сообщением «+10 Гриффиндор» или «-5 Слизерину», профессора — тем же текстом в посте туппера. Роли задаются в «Доступе»: «Очки факультетов» и «Преподавание». Удалённое сообщение отменяет начисление.",
        ]
          .filter((line) => line !== null)
          .join("\n"),
      ),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "### Последние изменения",
          recent.length
            ? recent
                .map(
                  (log) =>
                    `${HOUSE_EMOJIS[log.faculty as House]} **${log.delta > 0 ? "+" : ""}${log.delta}** · <@${log.actorId}> · ${SOURCE_LABELS[log.source] ?? log.source} · <t:${Math.floor(log.createdAt.getTime() / 1000)}:R>${
                      log.messageId && log.channelId ? ` · [сообщение](https://discord.com/channels/${log.guildId}/${log.channelId}/${log.messageId})` : ""
                    }${log.source === "MANUAL" && log.note ? `\n-# ${log.note}` : ""}`,
                )
                .join("\n")
            : "-# Очков пока никто не начислял.",
        ].join("\n"),
      ),
    );

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(this.customId(PointsAction.Adjust))
          .setLabel("Начислить или снять")
          .setEmoji("<:6509addguild:1518587247769817088>")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(this.customId(PointsAction.Channel))
          .setLabel("Канал часов")
          .setEmoji("<:479873settingsna:1518581042456432791>")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(this.customId(PointsAction.Reset))
          .setLabel("Обнулить")
          .setEmoji("<:14605delete:1518587266505642074>")
          .setStyle(ButtonStyle.Danger),
        ManageComponents.homeButton(),
      ),
    );

    return container;
  }

  public static resetConfirm() {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:14605delete:1518587266505642074> Обнулить очки",
          "",
          `${ARROW} У всех факультетов станет 0 очков — например, к новому учебному году.`,
          "-# История сохранится, но удаление старых сообщений больше не будет менять очки.",
        ].join("\n"),
      ),
    );

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(this.customId(PointsAction.ResetConfirm))
          .setLabel("Обнулить все очки")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(this.customId(PointsAction.Root))
          .setLabel("Отмена")
          .setStyle(ButtonStyle.Secondary),
      ),
    );

    return container;
  }

  public static adjustModal() {
    return new ModalBuilder()
      .setCustomId(this.customId(PointsAction.AdjustModal))
      .setTitle("Очки факультета")
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Факультет")
          .setStringSelectMenuComponent(
            new StringSelectMenuBuilder()
              .setCustomId(PointsFields.House)
              .setRequired(true)
              .addOptions(
                HOUSES.map((faculty) =>
                  new StringSelectMenuOptionBuilder().setLabel(HOUSE_LABELS[faculty]).setEmoji(HOUSE_EMOJIS[faculty]).setValue(faculty),
                ),
              ),
          ),
        new LabelBuilder()
          .setLabel("Сколько очков")
          .setDescription(`«+10» чтобы начислить, «-5» чтобы снять. До ${POINTS_MAX_DELTA} за раз`)
          .setTextInputComponent(
            new TextInputBuilder().setCustomId(PointsFields.Amount).setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(5).setPlaceholder("+10"),
          ),
        new LabelBuilder()
          .setLabel("За что")
          .setTextInputComponent(
            new TextInputBuilder().setCustomId(PointsFields.Note).setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(200).setPlaceholder("Победа в квиддичном матче"),
          ),
      );
  }

  public static channelModal(current: string | null, inGuild: boolean) {
    return new ModalBuilder()
      .setCustomId(this.customId(PointsAction.ChannelModal))
      .setTitle("Канал часов факультетов")
      .addLabelComponents(
        ChannelField.label({
          id: PointsFields.Channel,
          label: "Канал",
          description: "Здесь бот держит картинку с песочными часами и обновляет её",
          placeholder: "Канал для часов факультетов",
          types: SETTINGS_CHANNEL_TYPES,
          current,
          required: false,
          inGuild,
          empty: "не публиковать",
        }),
      );
  }
}
