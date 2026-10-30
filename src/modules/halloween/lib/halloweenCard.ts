import { fileURLToPath } from "node:url";

import {
  AttachmentBuilder,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from "discord.js";

import { CANDY, PUMPKIN, PUMPKIN_LIMIT } from "../types/halloween.js";

export const BANNER_FILE = "halloween.webp";

const BANNER_PATH = fileURLToPath(new URL("../../../../assets/halloween/banner.webp", import.meta.url));
const PAD = "⠀".repeat(60);
const DIVIDER = "🦇 ⠀·⠀ 🕯️ ⠀·⠀ 🕸️ ⠀·⠀ 🕯️ ⠀·⠀ 🦇";

const unix = (date: Date) => Math.floor(date.getTime() / 1000);

export class HalloweenCard {
  public static attachment() {
    return new AttachmentBuilder(BANNER_PATH, { name: BANNER_FILE });
  }

  public static banner(container: ContainerBuilder, description = "Хэллоуин в CoMS") {
    return container.addMediaGalleryComponents(
      new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(`attachment://${BANNER_FILE}`).setDescription(description)),
    );
  }

  public static drop(expiresAt: Date, candyMin: number, candyMax: number) {
    const container = this.banner(new ContainerBuilder().setAccentColor(0x475b56), "Тыква стучится в канал");

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${PUMPKIN} Магия или жизнь?`,
          "> *Из темноты выкатилась тыква и смотрит прямо на вас горящими глазами…*",
          `-# ${DIVIDER}`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `🪄 **Магия** — горсть конфет ${CANDY} (${candyMin === candyMax ? candyMin : `${candyMin}–${candyMax}`} шт.)`,
          `🫀 **Жизнь** — тыква-артефакт ${PUMPKIN} (на руках не больше ${PUMPKIN_LIMIT})`,
          "",
          `-# Ответьте на это сообщение одним словом — «магия» или «жизнь». Награда достанется первому. Тыква укатится <t:${unix(expiresAt)}:R>.`,
          `-# ${PAD}`,
        ].join("\n"),
      ),
    );

    return container;
  }

  public static claimed(winnerId: string, magic: boolean, reward: string) {
    const container = this.banner(new ContainerBuilder().setAccentColor(0x475b56), "Тыкву забрали");

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${PUMPKIN} ~~Магия или жизнь?~~`,
          `> <@${winnerId}> выбрал(а) **${magic ? "магию 🪄" : "жизнь 🫀"}** и унёс(ла) ${reward}.`,
          `-# ${DIVIDER}`,
          "-# Следующая тыква уже где-то рядом. Свои сладости смотрите в /halloween.",
          `-# ${PAD}`,
        ].join("\n"),
      ),
    );

    return container;
  }

  public static expired() {
    const container = this.banner(new ContainerBuilder().setAccentColor(0x475b56), "Тыква укатилась");

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${PUMPKIN} ~~Магия или жизнь?~~`,
          "> *Никто не ответил — тыква хихикнула и укатилась в темноту.*",
          `-# ${DIVIDER}`,
          `-# ${PAD}`,
        ].join("\n"),
      ),
    );

    return container;
  }
}
