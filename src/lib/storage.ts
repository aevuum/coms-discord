import { randomUUID } from "node:crypto";

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Attachment } from "discord.js";

const MAX_BYTES = 8 * 1024 * 1024;

const DOWNLOAD_TIMEOUT_MS = 20_000;

const EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
};

export class StorageError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "StorageError";
  }
}

export class Storage {
  private static client: S3Client | null = null;

  public static url(path: string | null | undefined) {
    const prefix = process.env.S3_PUBLIC_URL?.replace(/\/+$/, "");

    return path && prefix ? `${prefix}${path}` : null;
  }

  public static media(path: string | null | undefined, legacyUrl?: string | null) {
    return this.url(path) ?? legacyUrl ?? null;
  }

  public static async uploadAttachment(attachment: Attachment) {
    if (attachment.size > MAX_BYTES) {
      throw new StorageError("Изображение должно быть не больше 8 МБ.");
    }

    return this.uploadFromUrl(attachment.url);
  }

  public static async uploadFromUrl(url: string) {
    const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) }).catch(
      () => null,
    );

    if (!response?.ok) {
      throw new StorageError("Не удалось скачать изображение по ссылке.");
    }

    if (Number(response.headers.get("content-length") ?? 0) > MAX_BYTES) {
      throw new StorageError("Изображение должно быть не больше 8 МБ.");
    }

    const mime = (response.headers.get("content-type") ?? "").split(";")[0].trim();

    return this.uploadBuffer(new Uint8Array(await response.arrayBuffer()), mime);
  }

  public static async fromLink(text: string, currentPath: string | null, legacyUrl: string | null) {
    const link = text.trim();

    if (link && link === this.media(currentPath, legacyUrl)) {
      return undefined;
    }

    if (!link) {
      return currentPath || legacyUrl ? null : undefined;
    }

    if (!/^https:\/\/\S+$/i.test(link) || link.length > 500) {
      throw new StorageError("Ссылка на картинку должна начинаться с https:// и быть не длиннее 500 символов.");
    }

    return this.uploadFromUrl(link);
  }

  public static async uploadBuffer(data: Uint8Array, mime: string) {
    const extension = EXTENSIONS[mime];

    if (!extension) {
      throw new StorageError("Можно загрузить только изображение PNG, JPG, GIF или WEBP.");
    }

    if (data.byteLength > MAX_BYTES) {
      throw new StorageError("Изображение должно быть не больше 8 МБ.");
    }

    const key = `public/${randomUUID().replaceAll("-", "")}.${extension}`;

    await this.getClient().send(
      new PutObjectCommand({
        Bucket: this.bucket(),
        Key: key,
        Body: data,
        ContentType: mime,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );

    return `/${key}`;
  }

  public static async delete(path: string | null | undefined) {
    if (!path) {
      return;
    }

    await this.getClient()
      .send(new DeleteObjectCommand({ Bucket: this.bucket(), Key: path.replace(/^\//, "") }))
      .catch(() => null);
  }

  private static bucket() {
    const bucket = process.env.S3_BUCKET;

    if (!bucket) {
      throw new StorageError("Хранилище изображений не настроено.");
    }

    return bucket;
  }

  private static getClient() {
    if (!this.client) {
      const { S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;

      if (!S3_ENDPOINT || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
        throw new StorageError("Хранилище изображений не настроено.");
      }

      this.client = new S3Client({
        endpoint: S3_ENDPOINT,
        region: S3_REGION || "us-east-1",
        forcePathStyle: true,
        credentials: {
          accessKeyId: S3_ACCESS_KEY_ID,
          secretAccessKey: S3_SECRET_ACCESS_KEY,
        },
      });
    }

    return this.client;
  }
}
