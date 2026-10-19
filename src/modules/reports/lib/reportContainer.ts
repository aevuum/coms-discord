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

import type { Report, ReportStatus } from "../../../database/generated/prisma/client.js";

import { ReportAction, ReportCustomIds } from "./reportCustomIds.js";

const ARROW = "<:383438arrowright:1518587353390907473>";
const HEADER = "<:563621mod8:1518587360886128661>";
const SUCCESS = "<:312537mark:1518581040548024430>";
const ERROR = "<:240191mark:1518581039172292688>";

const STATUS_COLORS: Record<ReportStatus, number> = {
  OPEN: 0xc0392b,
  REVIEWING: 0xc9a227,
  RESOLVED: 0x2e8b57,
  REJECTED: 0x5f6b68,
};

export class ReportContainer {
  public static staff(report: Report, previousReports: number) {
    const container = new ContainerBuilder().setAccentColor(STATUS_COLORS[report.status]);

    const createdAt = Math.floor(report.createdAt.getTime() / 1000);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${HEADER} Жалоба`,
          `${ARROW} **От:** <@${report.reporterId}> (\`${report.reporterId}\`)`,
          `${ARROW} **На:** <@${report.targetId}> (\`${report.targetId}\`)`,
          report.reason ? `${ARROW} **Правило:** ${report.reason}` : null,
          `${ARROW} **Отправлена:** <t:${createdAt}:f>`,
          previousReports > 0
            ? `-# Ранее на этого участника жаловались ${previousReports} раз.`
            : null,
        ]
          .filter((line) => line !== null)
          .join("\n"),
      ),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### Суть проблемы\n${this.quote(report.description)}`),
    );

    if (report.channelId && report.messageId) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            "### Сообщение",
            report.messageContent ? this.quote(report.messageContent) : "-# Без текста",
            `-# Канал: <#${report.channelId}>`,
          ].join("\n"),
        ),
      );
    }

    if (report.images.length) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          report.images.map((name) => new MediaGalleryItemBuilder().setURL(`attachment://${name}`)),
        ),
      );
    }

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(this.status(report)));

    const buttons: ButtonBuilder[] = [];

    if (report.channelId && report.messageId) {
      buttons.push(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Link)
          .setLabel("Перейти к сообщению")
          .setURL(`https://discord.com/channels/${report.guildId}/${report.channelId}/${report.messageId}`),
      );
    }

    if (report.status === "OPEN") {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(ReportCustomIds.build(ReportAction.Take, report.id))
          .setStyle(ButtonStyle.Primary)
          .setLabel("Рассмотреть"),
      );
    }

    if (report.status === "OPEN" || report.status === "REVIEWING") {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(ReportCustomIds.build(ReportAction.Resolve, report.id))
          .setStyle(ButtonStyle.Success)
          .setLabel("Меры приняты"),
        new ButtonBuilder()
          .setCustomId(ReportCustomIds.build(ReportAction.Reject, report.id))
          .setStyle(ButtonStyle.Danger)
          .setLabel("Отклонить"),
      );
    }

    if (buttons.length) {
      container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons));
    }

    return container;
  }

  public static reporterNotice(report: Report) {
    const resolved = report.status === "RESOLVED";

    return new ContainerBuilder()
      .setAccentColor(STATUS_COLORS[report.status])
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            `## ${HEADER} Ваша жалоба рассмотрена`,
            `${ARROW} Жалоба на <@${report.targetId}>: ${
              resolved ? "администрация приняла меры." : "администрация не нашла нарушения."
            }`,
            "-# Спасибо, что помогаете поддерживать порядок на сервере.",
          ].join("\n"),
        ),
      );
  }

  public static success(text: string) {
    return new ContainerBuilder()
      .setAccentColor(0x2e8b57)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${SUCCESS} ${text}`));
  }

  public static error(text: string) {
    return new ContainerBuilder()
      .setAccentColor(0xc0392b)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${ERROR} ${text}`));
  }

  private static status(report: Report) {
    switch (report.status) {
      case "OPEN":
        return "**Статус:** 🔴 Ожидает рассмотрения";
      case "REVIEWING":
        return `**Статус:** 🟡 Рассматривает <@${report.reviewerId}>`;
      case "RESOLVED":
        return `**Статус:** 🟢 Меры приняты · <@${report.reviewerId}>${this.closedAt(report)}`;
      case "REJECTED":
        return `**Статус:** ⚪ Отклонена · <@${report.reviewerId}>${this.closedAt(report)}`;
    }
  }

  private static closedAt(report: Report) {
    return report.closedAt ? ` · <t:${Math.floor(report.closedAt.getTime() / 1000)}:R>` : "";
  }

  private static quote(text: string) {
    return text
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  }
}
