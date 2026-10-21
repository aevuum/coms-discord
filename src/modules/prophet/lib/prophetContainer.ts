import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
} from "discord.js";

import { PROPHET_DELIVERY_PRICE_KNUTS, PROPHET_NAMES_PER_MESSAGE } from "./prophetConfig.js";

export type ProphetRecipient = {
  characterId: string;
  name: string;
  ownerId: string;
  paid: boolean;
};

export class ProphetContainer {
  public static delivery(recipients: ProphetRecipient[], issueUrl: string, publishedAt: Date) {
    const shown = recipients.slice(0, PROPHET_NAMES_PER_MESSAGE);
    const timestamp = Math.floor(publishedAt.getTime() / 1000);
    const single = recipients.length === 1;
    const price = this.price();

    return new ContainerBuilder().setAccentColor(0x475b56)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            "## 🦉 Почтовая сова",
            single ? this.singleLine(shown[0]) : "Сюда одна за другой влетают совы с «Ежедневным пророком» в клювах и оставляют свежий выпуск каждому:",
            single
              ? `-# <@${shown[0].ownerId}>`
              : shown
                  .map(
                    (recipient) =>
                      `🗞️ **${recipient.name}** · <@${recipient.ownerId}>${recipient.paid ? "" : " · <:teal_feather:1562262848598577284> сова улетела без оплаты"}`,
                  )
                  .join("\n"),
            recipients.length > shown.length ? `-# и ещё ${recipients.length - shown.length}` : null,
            `-# Выпуск от <t:${timestamp}:f> · за доставку списывается ${price}`,
          ]
            .filter((line) => line !== null)
            .join("\n"),
        ),
      )
      .addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel("Читать выпуск")
            .setEmoji("📰")
            .setURL(issueUrl),
        ),
      );
  }

  private static singleLine(recipient: ProphetRecipient) {
    const intro = `**${recipient.name}** получает почту: в окно влетает сова с «Ежедневным пророком» в клюве и бросает свежий выпуск.`;

    return recipient.paid
      ? `${intro} Она требует за доставку кнат, получает его и улетает.`
      : `${intro} Она требует за доставку кнат, но кошелёк пуст — сова обиженно ухает и улетает без оплаты.`;
  }

  private static price() {
    return PROPHET_DELIVERY_PRICE_KNUTS === 1 ? "1 кнат" : `${PROPHET_DELIVERY_PRICE_KNUTS} кн.`;
  }
}
