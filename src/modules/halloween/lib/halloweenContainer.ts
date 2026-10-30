import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
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

import type { HalloweenOffer, HalloweenSettings, ShopItem } from "../../../database/generated/prisma/client.js";

import { ManageComponents } from "../../manage/lib/manageComponents.js";
import { MoscowTime } from "../../schedule/lib/moscowTime.js";
import { CANDY, PUMPKIN, PUMPKIN_LIMIT } from "../types/halloween.js";
import { HalloweenCard } from "./halloweenCard.js";

export type OfferView = HalloweenOffer & { item: ShopItem };

export enum HalloweenAction {
  Buy = "buy",
  Exchange = "exchange",
  ExchangeModal = "exchange_modal",
}

export enum HalloweenAdminAction {
  Root = "root",
  Toggle = "toggle",
  Settings = "settings",
  SettingsModal = "settings_modal",
  Channels = "channels",
  ChannelsModal = "channels_modal",
  Offers = "offers",
  OfferPick = "offer_pick",
  OfferModal = "offer_modal",
  OfferRemove = "offer_remove",
  Spawn = "spawn",
}

export const HalloweenFields = {
  Amount: "amount",
  Interval: "interval",
  Lifetime: "lifetime",
  Candies: "candies",
  Rates: "rates",
  EndsAt: "ends_at",
  Channels: "channels",
  CandyPrice: "candy_price",
  PumpkinPrice: "pumpkin_price",
} as const;

const SUCCESS = "<:312537mark:1518581040548024430>";
const ARROW = "<:48765whitearrow:1518587298281685173>";
const BACK = "<:26204blackarrow:1518587278467792997>";

const text = (container: ContainerBuilder, lines: (string | null | false)[]) =>
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(lines.filter((line): line is string => typeof line === "string").join("\n")),
  );

const price = (offer: HalloweenOffer) =>
  [offer.candyPrice ? `${offer.candyPrice} ${CANDY}` : null, offer.pumpkinPrice ? `${offer.pumpkinPrice} ${PUMPKIN}` : null]
    .filter(Boolean)
    .join(" + ") || "бесплатно";

const plainPrice = (offer: HalloweenOffer) =>
  [offer.candyPrice ? `${offer.candyPrice} конф.` : null, offer.pumpkinPrice ? `${offer.pumpkinPrice} тыкв.` : null].filter(Boolean).join(" + ") ||
  "бесплатно";

export class HalloweenContainer {
  public static id(action: HalloweenAction, ...args: string[]) {
    return ["hween", action, ...args].join(":");
  }

  public static adminId(action: HalloweenAdminAction, ...args: string[]) {
    return ["hweenadm", action, ...args].join(":");
  }

  public static parse<T extends string>(prefix: "hween" | "hweenadm", actions: Record<string, T>, customId: string) {
    const [head, action, ...args] = customId.split(":");

    return head === prefix && Object.values(actions).includes(action as T) ? { action: action as T, args } : null;
  }

  public static player(settings: HalloweenSettings, candy: number, pumpkin: number, offers: OfferView[], notice: string | null = null) {
    const container = HalloweenCard.banner(new ContainerBuilder().setAccentColor(0x475b56));
    const running = settings.enabled && (!settings.endsAt || settings.endsAt > new Date());

    text(container, [
      `# ${PUMPKIN} Хэллоуин`,
      running
        ? `-# Тыквы появляются в каналах общения${settings.endsAt ? ` до <t:${Math.floor(settings.endsAt.getTime() / 1000)}:f>` : ""}. Ответьте на тыкву «магия» или «жизнь» — первый заберёт награду.`
        : "-# Сейчас тыквы не появляются, но лавка и обмен работают.",
      notice ? `${SUCCESS} ${notice}` : null,
      "",
      `${CANDY} **Конфеты:** ${candy}`,
      `${PUMPKIN} **Тыквы-артефакты:** ${pumpkin} из ${PUMPKIN_LIMIT}`,
    ]);

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    text(container, [
      "### Лавка",
      offers.length
        ? offers.map((offer) => `${ARROW} ${offer.item.emoji ? `${offer.item.emoji} ` : ""}**${offer.item.name}** — ${price(offer)}`).join("\n")
        : "-# Товаров пока нет — администрация скоро их добавит.",
      `-# Обмен на комс-коины: 1 ${CANDY} = ${settings.candyRate}, 1 ${PUMPKIN} = ${settings.pumpkinRate}. Купленные вещи попадают в инвентарь профиля.`,
    ]);

    if (offers.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(this.id(HalloweenAction.Buy))
            .setPlaceholder("Купить в лавке")
            .addOptions(
              offers.map((offer) => {
                const option = new StringSelectMenuOptionBuilder()
                  .setLabel(offer.item.name.slice(0, 100))
                  .setDescription(plainPrice(offer).slice(0, 100))
                  .setValue(offer.id);

                return offer.item.emoji ? option.setEmoji(offer.item.emoji) : option;
              }),
            ),
        ),
      );
    }

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(this.id(HalloweenAction.Exchange, "candy"))
          .setLabel("Обменять конфеты")
          .setEmoji(CANDY)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(!candy),
        new ButtonBuilder()
          .setCustomId(this.id(HalloweenAction.Exchange, "pumpkin"))
          .setLabel("Обменять тыквы")
          .setEmoji(PUMPKIN)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(!pumpkin),
      ),
    );

    return container;
  }

  public static exchangeModal(kind: "candy" | "pumpkin", held: number, rate: number) {
    return new ModalBuilder()
      .setCustomId(this.id(HalloweenAction.ExchangeModal, kind))
      .setTitle(kind === "candy" ? "Обмен конфет" : "Обмен тыкв-артефактов")
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Сколько обменять")
          .setDescription(`У вас ${held}. Курс: 1 = ${rate} комс-коинов. Можно написать «все»`)
          .setTextInputComponent(
            new TextInputBuilder().setCustomId(HalloweenFields.Amount).setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(6).setValue(String(held)),
          ),
      );
  }

  public static admin(settings: HalloweenSettings | null, offers: OfferView[], notice: string | null = null) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);
    const running = Boolean(settings?.enabled);

    text(container, [
      `# ${PUMPKIN} Хэллоуин`,
      notice ? `${SUCCESS} ${notice}` : null,
      "",
      `${running ? "<:dot_green:1562262861374423044> **Ивент идёт**" : "<:dot_white:1562262867846373436> **Ивент выключен**"}${settings?.endsAt ? ` · до ${MoscowTime.format(settings.endsAt)} МСК` : ""}`,
      running && settings?.nextDropAt ? `${ARROW} Следующая тыква: <t:${Math.floor(settings.nextDropAt.getTime() / 1000)}:R>` : null,
      `${ARROW} Каналы: ${settings?.channelIds.length ? settings.channelIds.map((id) => `<#${id}>`).join(" ") : "не выбраны"}`,
      `${ARROW} Тыква раз в ${settings?.minMinutes ?? 30}–${settings?.maxMinutes ?? 90} мин., живёт ${settings?.lifetimeMinutes ?? 10} мин.`,
      `${ARROW} За магию ${settings?.candyMin ?? 1}–${settings?.candyMax ?? 5} ${CANDY}, за жизнь 1 ${PUMPKIN} (не больше ${PUMPKIN_LIMIT} на руках)`,
      `${ARROW} Обмен: 1 ${CANDY} = ${settings?.candyRate ?? 1}, 1 ${PUMPKIN} = ${settings?.pumpkinRate ?? 25} комс-коинов`,
      `${ARROW} В лавке товаров: ${offers.length}`,
      "-# Тыква чаще появляется в канале, где недавно писали. Игроки смотрят награды и лавку в /halloween.",
    ]);

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(this.adminId(HalloweenAdminAction.Toggle))
          .setLabel(running ? "Выключить" : "Включить")
          .setStyle(running ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId(this.adminId(HalloweenAdminAction.Settings)).setLabel("Настройки").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(this.adminId(HalloweenAdminAction.Channels)).setLabel("Каналы").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(this.adminId(HalloweenAdminAction.Offers)).setLabel("Лавка").setStyle(ButtonStyle.Secondary),
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(this.adminId(HalloweenAdminAction.Spawn))
          .setLabel("Тыква сейчас")
          .setEmoji(PUMPKIN)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!settings?.channelIds.length),
        ManageComponents.homeButton(),
      ),
    );

    return container;
  }

  public static offers(offers: OfferView[], candidates: ShopItem[], notice: string | null = null) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    text(container, [
      `# ${PUMPKIN} Лавка Хэллоуина`,
      notice ? `${SUCCESS} ${notice}` : null,
      "",
      offers.length ? offers.map((offer) => `${ARROW} **${offer.item.name}** — ${price(offer)}`).join("\n") : "-# Товаров пока нет.",
      "-# Товар берётся из обычного магазина: создайте его в «Магазине» (можно скрытым), затем добавьте сюда и задайте цену в конфетах и тыквах.",
    ]);

    if (candidates.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(this.adminId(HalloweenAdminAction.OfferPick))
            .setPlaceholder("Добавить товар или изменить цену")
            .addOptions(
              candidates.map((item) => {
                const option = new StringSelectMenuOptionBuilder()
                  .setLabel(item.name.slice(0, 100))
                  .setDescription(item.isActive ? "в магазине" : "скрыт в магазине")
                  .setValue(item.id);

                return item.emoji ? option.setEmoji(item.emoji) : option;
              }),
            ),
        ),
      );
    }

    if (offers.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(this.adminId(HalloweenAdminAction.OfferRemove))
            .setPlaceholder("Убрать товар из лавки")
            .addOptions(offers.map((offer) => new StringSelectMenuOptionBuilder().setLabel(offer.item.name.slice(0, 100)).setValue(offer.id))),
        ),
      );
    }

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(this.adminId(HalloweenAdminAction.Root)).setLabel("Назад").setEmoji(BACK).setStyle(ButtonStyle.Secondary),
      ),
    );

    return container;
  }

  public static offerModal(item: ShopItem, offer: HalloweenOffer | null) {
    const field = (id: string, value: number) =>
      new TextInputBuilder().setCustomId(id).setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(6).setValue(String(value));

    return new ModalBuilder()
      .setCustomId(this.adminId(HalloweenAdminAction.OfferModal, item.id))
      .setTitle(`Цена · ${item.name}`.slice(0, 45))
      .addLabelComponents(
        new LabelBuilder().setLabel("Конфеты").setDescription("0 — без конфет").setTextInputComponent(field(HalloweenFields.CandyPrice, offer?.candyPrice ?? 10)),
        new LabelBuilder().setLabel("Тыквы-артефакты").setDescription(`0 — без тыкв, максимум ${PUMPKIN_LIMIT}`).setTextInputComponent(field(HalloweenFields.PumpkinPrice, offer?.pumpkinPrice ?? 0)),
      );
  }

  public static settingsModal(settings: HalloweenSettings | null) {
    const field = (id: string, value: string, placeholder: string, required = true) => {
      const input = new TextInputBuilder().setCustomId(id).setStyle(TextInputStyle.Short).setRequired(required).setMaxLength(20).setPlaceholder(placeholder);

      return value ? input.setValue(value) : input;
    };

    return new ModalBuilder()
      .setCustomId(this.adminId(HalloweenAdminAction.SettingsModal))
      .setTitle("Настройки Хэллоуина")
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Как часто тыквы, минут")
          .setDescription("Случайно в этом промежутке, например 30-90")
          .setTextInputComponent(field(HalloweenFields.Interval, `${settings?.minMinutes ?? 30}-${settings?.maxMinutes ?? 90}`, "30-90")),
        new LabelBuilder()
          .setLabel("Сколько живёт тыква, минут")
          .setTextInputComponent(field(HalloweenFields.Lifetime, String(settings?.lifetimeMinutes ?? 10), "10")),
        new LabelBuilder()
          .setLabel("Конфеты за магию")
          .setDescription("Случайно в этом промежутке, например 1-5")
          .setTextInputComponent(field(HalloweenFields.Candies, `${settings?.candyMin ?? 1}-${settings?.candyMax ?? 5}`, "1-5")),
        new LabelBuilder()
          .setLabel("Курс обмена на комс-коины")
          .setDescription("За конфету / за тыкву, например 1/25")
          .setTextInputComponent(field(HalloweenFields.Rates, `${settings?.candyRate ?? 1}/${settings?.pumpkinRate ?? 25}`, "1/25")),
        new LabelBuilder()
          .setLabel("Конец ивента (МСК)")
          .setDescription("ДД.ММ.ГГГГ ЧЧ:ММ — после него тыквы перестанут появляться. Пусто — без срока")
          .setTextInputComponent(field(HalloweenFields.EndsAt, settings?.endsAt ? MoscowTime.format(settings.endsAt) : "", "01.11.2026 23:59", false)),
      );
  }

  public static channelsModal(settings: HalloweenSettings | null, inGuild: boolean) {
    const label = new LabelBuilder().setLabel("Каналы общения (не РП)");

    if (inGuild) {
      const select = new ChannelSelectMenuBuilder()
        .setCustomId(HalloweenFields.Channels)
        .setChannelTypes(ChannelType.GuildText)
        .setPlaceholder("Где могут появляться тыквы")
        .setMinValues(0)
        .setMaxValues(15)
        .setRequired(false);

      if (settings?.channelIds.length) {
        select.setDefaultChannels(...settings.channelIds.slice(0, 15));
      }

      label.setDescription("До 15 каналов").setChannelSelectMenuComponent(select);
    } else {
      label
        .setDescription("Ссылки, ID или части названий через запятую")
        .setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(HalloweenFields.Channels)
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setMaxLength(1500)
            .setValue((settings?.channelIds ?? []).join(", ") || " "),
        );
    }

    return new ModalBuilder().setCustomId(this.adminId(HalloweenAdminAction.ChannelsModal)).setTitle("Каналы для тыкв").addLabelComponents(label);
  }
}
