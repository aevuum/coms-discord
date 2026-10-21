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

import type { Giveaway } from "../../../database/generated/prisma/client.js";

import { Storage } from "../../../lib/storage.js";
import { GiveawayCustomIds } from "./giveawayCustomIds.js";

const ARROW = "<:383438arrowright:1518587353390907473>";
const SUCCESS = "<:312537mark:1518581040548024430>";
const ERROR = "<:240191mark:1518581039172292688>";


export class GiveawayContainer {
  public static message(giveaway: Giveaway, entries: number, pingRoleId: string | null = null) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    const image = Storage.url(giveaway.imagePath);

    if (image) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(image)),
      );
    }

    const endsAt = Math.floor(giveaway.endsAt.getTime() / 1000);
    const endedAt = Math.floor((giveaway.endedAt ?? giveaway.endsAt).getTime() / 1000);

    const header =
      giveaway.status === "ACTIVE"
        ? "# <:gift_teal:1562262879812460639> Розыгрыш"
        : giveaway.status === "ENDED"
          ? "# <:teal_stars:1562262850913697815> Розыгрыш завершён"
          : "# 🚫 Розыгрыш отменён";

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          pingRoleId && giveaway.status === "ACTIVE" ? `<@&${pingRoleId}>` : null,
          header,
          `## ${giveaway.prize}`,
          giveaway.description ? this.quote(giveaway.description) : null,
        ]
          .filter((line) => line !== null)
          .join("\n"),
      ),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    const lines =
      giveaway.status === "ACTIVE"
        ? [
            `${ARROW} Победителей: **${giveaway.winnerCount}**`,
            `${ARROW} Участников: **${entries}**`,
            `${ARROW} Итоги <t:${endsAt}:R> (<t:${endsAt}:f>)`,
            "-# Нажмите кнопку ниже, чтобы участвовать. Нажмите ещё раз, чтобы выйти из розыгрыша.",
          ]
        : giveaway.status === "ENDED"
          ? [
              giveaway.winnerIds.length
                ? `${ARROW} ${giveaway.winnerIds.length > 1 ? "Победители" : "Победитель"}: ${giveaway.winnerIds.map((id) => `<@${id}>`).join(", ")}`
                : `${ARROW} Победителей нет: никто не участвовал.`,
              `${ARROW} Участников: **${entries}**`,
              `${ARROW} Завершён <t:${endedAt}:f>`,
            ]
          : [`${ARROW} Участников было: **${entries}**`, `${ARROW} Отменён <t:${endedAt}:f>`];

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [...lines, `-# Организатор: <@${giveaway.hostId}>`].join("\n"),
      ),
    );

    if (giveaway.status === "ACTIVE") {
      container.addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(GiveawayCustomIds.join(giveaway.id))
            .setLabel(`Участвовать · ${entries}`)
            .setEmoji("<:teal_stars:1562262850913697815>")
            .setStyle(ButtonStyle.Success),
        ),
      );
    }

    return container;
  }

  public static winners(giveaway: Giveaway, reroll: boolean) {
    return new ContainerBuilder().setAccentColor(0x475b56)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          giveaway.winnerIds.length
            ? [
                `## <:teal_stars:1562262850913697815> ${reroll ? "Новые победители" : "Итоги розыгрыша"}`,
                `${ARROW} Поздравляем ${giveaway.winnerIds.map((id) => `<@${id}>`).join(", ")}!`,
                `${ARROW} Приз: **${giveaway.prize}**`,
                `-# Для получения приза свяжитесь с <@${giveaway.hostId}>.`,
              ].join("\n")
            : `## <:gift_teal:1562262879812460639> Итоги розыгрыша\n${ARROW} Розыгрыш **${giveaway.prize}** завершён без победителей: никто не участвовал.`,
        ),
      );
  }

  public static winnerNotice(giveaway: Giveaway, messageUrl: string | null) {
    return new ContainerBuilder().setAccentColor(0x475b56)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            "## <:teal_stars:1562262850913697815> Вы выиграли в розыгрыше!",
            `${ARROW} Приз: **${giveaway.prize}**`,
            messageUrl ? `${ARROW} [Перейти к розыгрышу](${messageUrl})` : null,
            `-# Для получения приза свяжитесь с организатором <@${giveaway.hostId}>.`,
          ]
            .filter((line) => line !== null)
            .join("\n"),
        ),
      );
  }

  public static success(text: string) {
    return new ContainerBuilder().setAccentColor(0x475b56)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${SUCCESS} ${text}`));
  }

  public static error(text: string) {
    return new ContainerBuilder().setAccentColor(0x475b56)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${ERROR} ${text}`));
  }

  private static quote(text: string) {
    return text
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  }
}
