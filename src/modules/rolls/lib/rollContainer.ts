import { Storage } from "../../../lib/storage.js";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
} from "discord.js";

import type { RollEntry } from "../../../database/generated/prisma/client.js";

import { RollService } from "../service/rollService.js";
import type { RollKindMeta } from "../types/rolls.js";
import { RollCustomIds } from "./rollCustomIds.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const ERROR = "<:240191mark:1518581039172292688>";

export class RollContainer {
  public static result(
    meta: RollKindMeta,
    entry: RollEntry,
    chance: number,
    options: { reroll?: boolean; caption?: string } = {},
  ) {
    const stars = RollService.stars(chance);
    const reroll = options.reroll ?? true;

    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `-# ${meta.emoji} ${meta.single}`,
          `# ${entry.emoji ? `${entry.emoji} ` : ""}${entry.name} (${"★".repeat(stars)}${"☆".repeat(5 - stars)})`,
          entry.description ? `${ARROW} "${entry.description}"` : null,
          `-# Шанс выпадения: ${RollService.formatChance(chance)}`,
          options.caption ? `-# ${options.caption}` : null,
        ]
          .filter((line) => line !== null)
          .join("\n"),
      ),
    );

    if (Storage.media(entry.imagePath, entry.imageUrl)) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(Storage.media(entry.imagePath, entry.imageUrl)!)),
      );
    }

    if (!reroll) {
      return container;
    }

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(RollCustomIds.reroll(meta.slug))
          .setLabel("Перекрут")
          .setEmoji("<:84305verifiedgreen:1518587318926049290>")
          .setStyle(ButtonStyle.Secondary),
      ),
    );

    return container;
  }

  public static catalog(meta: RollKindMeta, entries: RollEntry[]) {
    const sorted = [...entries].sort(
      (left, right) =>
        RollService.effectiveChance(right, entries) - RollService.effectiveChance(left, entries),
    );

    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${meta.emoji} ${meta.plural}`,
          `${ARROW} Всё, что может выпасть по команде /${meta.command}. Чем больше звёзд, тем реже выпадает.`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        sorted.length
          ? sorted
              .map((entry) => {
                const chance = RollService.effectiveChance(entry, entries);

                return `${entry.emoji ?? ARROW} **${entry.name}** · ${this.stars(chance)} · ${RollService.formatChance(chance)}${entry.isDefault ? " · если не выпало ничего редкого" : ""}`;
              })
              .join("\n")
          : `-# ${meta.plural} ещё не настроены.`,
      ),
    );

    if (sorted.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(RollCustomIds.catalogEntry(meta.slug))
            .setPlaceholder(`Подробнее: выберите ${meta.accusative}`)
            .addOptions(
              sorted.slice(0, 25).map((entry) => {
                const chance = RollService.effectiveChance(entry, entries);

                const option = new StringSelectMenuOptionBuilder()
                  .setValue(entry.id)
                  .setLabel(entry.name.slice(0, 100))
                  .setDescription(`${this.stars(chance)} · ${RollService.formatChance(chance)}`);

                if (entry.emoji) {
                  option.setEmoji(entry.emoji);
                }

                return option;
              }),
            ),
        ),
      );
    }

    return container;
  }

  public static catalogEntry(meta: RollKindMeta, entry: RollEntry, chance: number) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `-# ${meta.emoji} ${meta.single}`,
          `# ${entry.emoji ? `${entry.emoji} ` : ""}${entry.name} (${this.stars(chance)})`,
          entry.description ? `${ARROW} "${entry.description}"` : "-# Без описания.",
          `-# Шанс выпадения: ${RollService.formatChance(chance)}${entry.isDefault ? " — выпадает, если не выпало ничего редкого" : ""}`,
        ].join("\n"),
      ),
    );

    if (Storage.media(entry.imagePath, entry.imageUrl)) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(Storage.media(entry.imagePath, entry.imageUrl)!)),
      );
    }

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(RollCustomIds.catalog(meta.slug))
          .setLabel(`Все ${meta.plural.toLowerCase()}`)
          .setEmoji("<:172852arrowleft:1518587345249763452>")
          .setStyle(ButtonStyle.Secondary),
      ),
    );

    return container;
  }

  private static stars(chance: number) {
    const stars = RollService.stars(chance);

    return `${"★".repeat(stars)}${"☆".repeat(5 - stars)}`;
  }

  public static error(message: string) {
    return new ContainerBuilder().setAccentColor(0x475b56)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([`## ${ERROR} Ошибка`, `${ARROW} ${message}`].join("\n")),
      );
  }
}
