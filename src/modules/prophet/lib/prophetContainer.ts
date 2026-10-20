import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
} from "discord.js";

import { PROPHET_NAMES_PER_MESSAGE } from "./prophetConfig.js";

export type ProphetRecipient = {
  name: string;
  ownerId: string;
};

export class ProphetContainer {
  public static delivery(recipients: ProphetRecipient[], issueUrl: string, publishedAt: Date) {
    const shown = recipients.slice(0, PROPHET_NAMES_PER_MESSAGE);
    const timestamp = Math.floor(publishedAt.getTime() / 1000);
    const single = recipients.length === 1;

    return new ContainerBuilder()
      .setAccentColor(0x8b7355)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            "## 🦉 Почтовая сова",
            single
              ? `**${shown[0].name}** получает почту: в окно влетает сова с «Ежедневным пророком» в клюве, бросает свежий выпуск, требует за доставку кнат и улетает.`
              : "Сюда одна за другой влетают совы с «Ежедневным пророком» в клювах и оставляют свежий выпуск каждому:",
            single
              ? `-# <@${shown[0].ownerId}>`
              : shown.map((recipient) => `🗞️ **${recipient.name}** · <@${recipient.ownerId}>`).join("\n"),
            recipients.length > shown.length ? `-# и ещё ${recipients.length - shown.length}` : null,
            `-# Выпуск от <t:${timestamp}:f>`,
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
}
