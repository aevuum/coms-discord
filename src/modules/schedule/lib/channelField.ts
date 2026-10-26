import {
  ChannelSelectMenuBuilder,
  ChannelType,
  LabelBuilder,
  TextInputBuilder,
  TextInputStyle,
  type Client,
  type ModalSubmitInteraction,
} from "discord.js";

import { ScheduleError } from "../types/schedule.js";

export type ChannelFieldOptions = {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  types: ChannelType[];
  current: string | null;
  required: boolean;
  inGuild: boolean;
  empty?: string;
};

export const SETTINGS_CHANNEL_TYPES = [ChannelType.GuildText];

const LINK = /discord(?:app)?\.com\/channels\/\d+\/(\d{17,20})/;
const MENTION = /^<#(\d{17,20})>$/;
const ID = /^\d{17,20}$/;

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, "");

export class ChannelField {
  public static label(options: ChannelFieldOptions) {
    const label = new LabelBuilder().setLabel(options.label);

    if (options.inGuild) {
      const select = new ChannelSelectMenuBuilder()
        .setCustomId(options.id)
        .setChannelTypes(...options.types)
        .setPlaceholder(options.placeholder)
        .setMinValues(options.required ? 1 : 0)
        .setMaxValues(1)
        .setRequired(options.required);

      if (options.current) {
        select.setDefaultChannels(options.current);
      }

      return label.setDescription(options.description).setChannelSelectMenuComponent(select);
    }

    const input = new TextInputBuilder()
      .setCustomId(options.id)
      .setStyle(TextInputStyle.Short)
      .setRequired(options.required)
      .setMaxLength(120)
      .setPlaceholder("Ссылка на канал, его ID или часть названия");

    if (options.current) {
      input.setValue(options.current);
    }

    return label
      .setDescription(`Ссылка на канал, его ID или часть названия${options.empty ? `. Пусто — ${options.empty}` : ""}`.slice(0, 100))
      .setTextInputComponent(input);
  }

  public static read(interaction: ModalSubmitInteraction, id: string, guildId: string, types: ChannelType[]) {
    const selected = (() => {
      try {
        return interaction.fields.getSelectedChannels(id);
      } catch {
        return undefined;
      }
    })();

    if (selected !== undefined) {
      return selected?.first()?.id ?? null;
    }

    return this.resolve(interaction.client, guildId, interaction.fields.getTextInputValue(id), types);
  }

  public static resolve(client: Client, guildId: string, raw: string, types: ChannelType[]) {
    const text = raw.trim().replace(/^#/, "");

    if (!text) {
      return null;
    }

    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      throw new ScheduleError("Сервер бота недоступен.");
    }

    const id = LINK.exec(text)?.[1] ?? MENTION.exec(text)?.[1] ?? (ID.test(text) ? text : null);

    if (id) {
      const channel = guild.channels.cache.get(id);

      if (!channel || !types.includes(channel.type)) {
        throw new ScheduleError(`Канал \`${text}\` не найден на сервере или не подходит.`);
      }

      return channel.id;
    }

    const query = normalize(text);
    const candidates = [...guild.channels.cache.values()].filter((channel) => types.includes(channel.type));
    const exact = candidates.filter((channel) => normalize(channel.name) === query);
    const partial = exact.length ? exact : candidates.filter((channel) => normalize(channel.name).includes(query));

    if (partial.length === 1) {
      return partial[0].id;
    }

    if (!partial.length) {
      throw new ScheduleError(`Не нашёл канал по запросу «${text}». Вставьте ссылку на канал: ПКМ по каналу → «Копировать ссылку».`);
    }

    throw new ScheduleError(
      `Под «${text}» подходит несколько каналов: ${partial.slice(0, 5).map((channel) => `<#${channel.id}>`).join(", ")}. Уточните название или вставьте ссылку.`,
    );
  }
}
