import {
  AttachmentBuilder,
  MessageFlags,
  type Attachment,
  type Guild,
  type User,
} from "discord.js";

import type { Report, ReportStatus } from "../../../database/generated/prisma/client.js";

import {
  REPORT_CHANNEL_ID,
  REPORT_COOLDOWN_MS,
  REPORT_MAX_IMAGE_BYTES,
  REPORT_MAX_IMAGES,
} from "../lib/reportConfig.js";
import { ReportContainer } from "../lib/reportContainer.js";
import { ReportRepository } from "../repositories/reportRepository.js";
import { ReportError } from "../types/report.js";

const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

type ReportInput = {
  guild: Guild;
  reporter: User;
  target: User;
  reason: string | null;
  description: string;
  channelId: string | null;
  messageId: string | null;
  images: Attachment[];
};

export class ReportService {
  private static cooldowns = new Map<string, number>();

  public static async submit(input: ReportInput) {
    if (input.target.id === input.reporter.id) {
      throw new ReportError("Нельзя пожаловаться на самого себя.");
    }

    if (input.target.bot) {
      throw new ReportError("Нельзя пожаловаться на бота.");
    }

    const last = this.cooldowns.get(input.reporter.id) ?? 0;

    if (Date.now() - last < REPORT_COOLDOWN_MS) {
      const retryAt = Math.ceil((last + REPORT_COOLDOWN_MS) / 1000);

      throw new ReportError(`Следующую жалобу можно отправить <t:${retryAt}:R>.`);
    }

    const channel = await input.guild.channels.fetch(REPORT_CHANNEL_ID).catch(() => null);

    if (!channel?.isSendable()) {
      throw new ReportError("Канал для жалоб недоступен. Сообщите администрации.");
    }

    const files = await this.downloadImages(input.images);

    const report = await ReportRepository.create({
      guildId: input.guild.id,
      reporterId: input.reporter.id,
      targetId: input.target.id,
      reason: input.reason,
      description: input.description,
      channelId: input.channelId,
      messageId: input.messageId,
      messageContent: await this.messageContent(input.guild, input.channelId, input.messageId),
      images: files.map((file) => file.name ?? ""),
    });

    try {
      const previous = (await ReportRepository.countAgainst(report.targetId)) - 1;

      const message = await channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [ReportContainer.staff(report, previous)],
        files,
        allowedMentions: { parse: [] },
      });

      await ReportRepository.setStaffMessage(report.id, message.id);
    } catch (error) {
      await ReportRepository.delete(report.id);

      throw error;
    }

    this.cooldowns.set(input.reporter.id, Date.now());

    return report;
  }

  public static async take(reportId: string, reviewerId: string) {
    if (!(await ReportRepository.take(reportId, reviewerId))) {
      throw new ReportError("Эту жалобу уже рассматривают или она закрыта.");
    }

    return this.load(reportId);
  }

  public static async close(reportId: string, reviewerId: string, status: ReportStatus) {
    if (!(await ReportRepository.close(reportId, reviewerId, status))) {
      throw new ReportError("Эта жалоба уже закрыта.");
    }

    return this.load(reportId);
  }

  public static async render(report: Report) {
    const previous = (await ReportRepository.countAgainst(report.targetId)) - 1;

    return ReportContainer.staff(report, previous);
  }

  public static async notifyReporter(guild: Guild, report: Report) {
    const user = await guild.client.users.fetch(report.reporterId).catch(() => null);

    await user
      ?.send({
        flags: MessageFlags.IsComponentsV2,
        components: [ReportContainer.reporterNotice(report)],
        allowedMentions: { parse: [] },
      })
      .catch(() => null);
  }

  private static async load(reportId: string) {
    const report = await ReportRepository.findById(reportId);

    if (!report) {
      throw new ReportError("Жалоба не найдена.");
    }

    return report;
  }

  private static async messageContent(guild: Guild, channelId: string | null, messageId: string | null) {
    if (!channelId || !messageId) {
      return null;
    }

    const channel = await guild.channels.fetch(channelId).catch(() => null);

    if (!channel?.isTextBased()) {
      return null;
    }

    const message = await channel.messages.fetch(messageId).catch(() => null);

    if (!message) {
      return null;
    }

    const parts = [message.content.trim()];

    if (message.webhookId) {
      parts.unshift(`**${message.author.username}** (персонаж):`);
    }

    if (message.attachments.size) {
      parts.push(`📎 Вложений: ${message.attachments.size}`);
    }

    const text = parts.filter(Boolean).join("\n");

    if (!text) {
      return null;
    }

    return text.length > 900 ? `${text.slice(0, 900)}…` : text;
  }

  private static async downloadImages(images: Attachment[]) {
    const accepted = images
      .filter((image) => image.contentType && IMAGE_EXTENSIONS[image.contentType.split(";")[0]])
      .slice(0, REPORT_MAX_IMAGES);

    if (images.length && !accepted.length) {
      throw new ReportError("Скриншоты должны быть изображениями PNG, JPG, GIF или WEBP.");
    }

    if (accepted.some((image) => image.size > REPORT_MAX_IMAGE_BYTES)) {
      throw new ReportError("Каждый скриншот должен весить не больше 8 МБ.");
    }

    return Promise.all(
      accepted.map(async (image, index) => {
        const response = await fetch(image.url, { signal: AbortSignal.timeout(15_000) });

        if (!response.ok) {
          throw new ReportError("Не удалось загрузить скриншоты. Попробуйте ещё раз.");
        }

        const extension = IMAGE_EXTENSIONS[image.contentType!.split(";")[0]];

        return new AttachmentBuilder(Buffer.from(await response.arrayBuffer()), {
          name: `report-${index + 1}.${extension}`,
        });
      }),
    );
  }
}
