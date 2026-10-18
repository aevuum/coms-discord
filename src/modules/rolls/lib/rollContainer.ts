import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from "discord.js";

import type { RollEntry } from "../../../database/generated/prisma/client.js";

import { RollService } from "../service/rollService.js";
import type { RollKindMeta } from "../types/rolls.js";
import { RollCustomIds } from "./rollCustomIds.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const ERROR = "<:240191mark:1518581039172292688>";

export class RollContainer {
  public static result(meta: RollKindMeta, entry: RollEntry, chance: number) {
    const stars = RollService.stars(chance);

    const container = new ContainerBuilder().setAccentColor(entry.isDefault ? 0x475b56 : 0xc9a227);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `-# ${meta.emoji} ${meta.single}`,
          `# ${entry.emoji ? `${entry.emoji} ` : ""}${entry.name} (${"★".repeat(stars)}${"☆".repeat(5 - stars)})`,
          entry.description ? `${ARROW} "${entry.description}"` : null,
          `-# Шанс выпадения: ${RollService.formatChance(chance)}`,
        ]
          .filter((line) => line !== null)
          .join("\n"),
      ),
    );

    if (entry.imageUrl) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(entry.imageUrl)),
      );
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

  public static error(message: string) {
    return new ContainerBuilder()
      .setAccentColor(0x475b56)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([`## ${ERROR} Ошибка`, `${ARROW} ${message}`].join("\n")),
      );
  }
}
