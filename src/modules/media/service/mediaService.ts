import { container } from "@sapphire/framework";
import {
  AttachmentBuilder,
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  type Attachment,
  type TextChannel,
} from "discord.js";

import { MediaRepository } from "../repositories/mediaRepository.js";

export class MediaError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "MediaError";
  }
}

const STORAGE_TOPIC = "coms-media-storage";
const STORAGE_NAME = "🗄・медиа-бота";
const STORAGE_CATEGORY_ID = "1440143482114015327";

const MAX_BYTES = 8 * 1024 * 1024;
const DEFAULT_URL_LIFETIME_MS = 20 * 60 * 60 * 1000;
const EXPIRY_MARGIN_MS = 2 * 60 * 60 * 1000;

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

export class MediaService {
  private static storageChannelId: string | null = null;

  public static async saveAttachment(attachment: Attachment) {
    if (!attachment.contentType || !EXTENSIONS[attachment.contentType.split(";")[0]]) {
      throw new MediaError("Можно загрузить только изображение PNG, JPG, GIF или WEBP.");
    }

    if (attachment.size > MAX_BYTES) {
      throw new MediaError("Изображение должно быть не больше 8 МБ.");
    }

    return this.saveFromUrl(attachment.url);
  }

  public static async saveFromUrl(url: string) {
    const response = await fetch(url).catch(() => null);

    if (!response?.ok) {
      throw new MediaError("Не удалось скачать изображение.");
    }

    const mime = (response.headers.get("content-type") ?? "").split(";")[0].trim();

    if (!EXTENSIONS[mime]) {
      throw new MediaError("Можно загрузить только изображение PNG, JPG, GIF или WEBP.");
    }

    const data = new Uint8Array(await response.arrayBuffer());

    if (data.byteLength > MAX_BYTES) {
      throw new MediaError("Изображение должно быть не больше 8 МБ.");
    }

    const image = await MediaRepository.create(data, mime);

    try {
      const url = await this.upload(image.id);

      return { id: image.id, url };
    } catch (error) {
      await MediaRepository.delete(image.id);

      throw error;
    }
  }

  public static async delete(id: string | null | undefined) {
    if (!id) {
      return;
    }

    const image = await MediaRepository.get(id);

    if (!image) {
      return;
    }

    if (image.messageId) {
      const channel = await this.getStorageChannel().catch(() => null);

      await channel?.messages.delete(image.messageId).catch(() => null);
    }

    await MediaRepository.delete(id);
  }

  public static async refreshExpiring() {
    const images = await MediaRepository.listExpiring(new Date(Date.now() + EXPIRY_MARGIN_MS));

    let refreshed = 0;

    for (const image of images) {
      try {
        const url = await this.refresh(image.id);

        await MediaRepository.applyUrl(image.id, url);

        refreshed++;
      } catch (error) {
        container.logger.error(error);
      }
    }

    return refreshed;
  }

  public static async migrateLegacy() {
    let migrated = 0;

    for (const character of await MediaRepository.listLegacyAvatars()) {
      const saved = await this.saveFromUrl(character.avatarUrl!).catch(() => null);

      if (saved) {
        await MediaRepository.setCharacterAvatar(character.id, saved.id, saved.url);
        migrated++;
      }
    }

    for (const user of await MediaRepository.listLegacyBanners()) {
      const saved = await this.saveFromUrl(user.profileBannerUrl!).catch(() => null);

      if (saved) {
        await MediaRepository.setUserBanner(user.id, saved.id, saved.url);
        migrated++;
      }
    }

    return migrated;
  }

  private static async refresh(id: string) {
    const image = await MediaRepository.get(id);

    if (!image) {
      throw new MediaError("Изображение не найдено.");
    }

    if (image.messageId) {
      const channel = await this.getStorageChannel();

      const message = await channel.messages
        .fetch({ message: image.messageId, force: true })
        .catch(() => null);

      const attachment = message?.attachments.first();

      if (attachment) {
        await MediaRepository.setLocation(image.id, image.messageId, attachment.url, this.expiry(attachment.url));

        return attachment.url;
      }
    }

    return this.upload(image.id);
  }

  private static async upload(id: string) {
    const image = await MediaRepository.get(id);

    if (!image) {
      throw new MediaError("Изображение не найдено.");
    }

    const channel = await this.getStorageChannel();

    const message = await channel.send({
      content: `image:${image.id}`,
      files: [
        new AttachmentBuilder(Buffer.from(image.data), {
          name: `${image.id}.${EXTENSIONS[image.mime] ?? "png"}`,
        }),
      ],
      allowedMentions: { parse: [] },
    });

    const url = message.attachments.first()!.url;

    await MediaRepository.setLocation(image.id, message.id, url, this.expiry(url));

    return url;
  }

  private static expiry(url: string) {
    const ex = new URL(url).searchParams.get("ex");

    const seconds = ex ? Number.parseInt(ex, 16) : Number.NaN;

    return Number.isFinite(seconds)
      ? new Date(seconds * 1000)
      : new Date(Date.now() + DEFAULT_URL_LIFETIME_MS);
  }

  private static async getStorageChannel(): Promise<TextChannel> {
    const guild = container.client.guilds.cache.get(process.env.GUILD_ID ?? "");

    if (!guild) {
      throw new MediaError("Сервер бота недоступен.");
    }

    if (this.storageChannelId) {
      const cached = guild.channels.cache.get(this.storageChannelId);

      if (cached?.type === ChannelType.GuildText) {
        return cached;
      }
    }

    const existing = guild.channels.cache.find(
      (channel): channel is TextChannel =>
        channel.type === ChannelType.GuildText && channel.topic === STORAGE_TOPIC,
    );

    const channel =
      existing ??
      (await guild.channels.create({
        name: STORAGE_NAME,
        type: ChannelType.GuildText,
        topic: STORAGE_TOPIC,
        parent: guild.channels.cache.has(STORAGE_CATEGORY_ID) ? STORAGE_CATEGORY_ID : undefined,
        reason: "Хранилище изображений бота",
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            type: OverwriteType.Role,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: container.client.user!.id,
            type: OverwriteType.Member,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
        ],
      }));

    this.storageChannelId = channel.id;

    return channel;
  }
}
