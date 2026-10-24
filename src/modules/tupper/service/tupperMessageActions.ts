import { container } from "@sapphire/framework";

import type { Client, Message } from "discord.js";

import prisma from "../../../database/prisma.js";
import { Mana } from "../../spells/lib/mana.js";
import { WebhookService } from "./webhookService.js";

const RETENTION_DAYS = 60;

export class TupperMessageError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TupperMessageError";
  }
}

export class TupperMessageActions {
  public static async record(messages: Message[], characterId: string, ownerId: string, threadId: string | null) {
    const [first] = messages;

    if (!first?.webhookId) {
      return;
    }

    await prisma.tupperMessage.createMany({
      data: messages.map((message) => ({
        messageId: message.id,
        groupId: first.id,
        characterId,
        ownerId,
        channelId: message.channelId,
        threadId,
        webhookId: message.webhookId ?? first.webhookId!,
      })),
      skipDuplicates: true,
    });
  }

  public static async find(messageId: string) {
    return prisma.tupperMessage.findUnique({ where: { messageId } });
  }

  public static async assertOwner(messageId: string, userId: string) {
    const record = await this.find(messageId);

    if (!record) {
      throw new TupperMessageError("Это не сообщение туппера или оно слишком старое, чтобы его менять.");
    }

    if (record.ownerId !== userId) {
      throw new TupperMessageError("Изменять и удалять сообщение туппера может только его владелец.");
    }

    return record;
  }

  public static async edit(client: Client, messageId: string, userId: string, input: string) {
    const record = await this.assertOwner(messageId, userId);
    const content = input.trim();

    if (!content.length) {
      throw new TupperMessageError("Текст сообщения не может быть пустым. Чтобы убрать сообщение, поставьте на него реакцию ❌.");
    }

    if (content.length > 2000) {
      throw new TupperMessageError("В одном сообщении туппера может быть не больше 2000 символов.");
    }

    await WebhookService.editMessage(client, record.webhookId, record.messageId, record.threadId, content);
  }

  public static async remove(client: Client, messageId: string, userId: string) {
    const record = await this.find(messageId);

    if (!record || record.ownerId !== userId) {
      return null;
    }

    const result = await prisma.$transaction(async (tx) => {
      const group = await tx.tupperMessage.findMany({ where: { groupId: record.groupId } });

      const claimed = await tx.tupperMessage.deleteMany({ where: { groupId: record.groupId } });

      if (!claimed.count) {
        return null;
      }

      const casts = await tx.spellCast.findMany({
        where: { messageId: record.groupId, characterId: record.characterId, refundedAt: null },
      });

      const refund = casts.reduce((sum, cast) => sum + cast.manaCost, 0);

      if (refund > 0) {
        const character = await tx.character.findUniqueOrThrow({
          where: { id: record.characterId },
          select: { mana: true, maxMana: true, manaUpdatedAt: true },
        });

        const regenerated = Mana.regenerate(character);

        await tx.character.update({
          where: { id: record.characterId },
          data: {
            mana: Math.min(regenerated.mana + refund, regenerated.maxMana),
            manaUpdatedAt: regenerated.manaUpdatedAt,
          },
        });

        await tx.spellCast.updateMany({
          where: { id: { in: casts.map((cast) => cast.id) } },
          data: { refundedAt: new Date() },
        });
      }

      return { group, casts, refund };
    });

    if (!result) {
      return null;
    }

    for (const message of result.group) {
      await WebhookService.deleteMessage(client, message.webhookId, message.messageId, message.threadId).catch((error) =>
        container.logger.warn(`Failed to delete tupper message ${message.messageId}: ${String(error)}`),
      );
    }

    const announcements = [...new Set(result.casts.map((cast) => cast.announceMessageId).filter((id): id is string => Boolean(id)))];

    if (announcements.length) {
      const channel = await client.channels.fetch(record.threadId ?? record.channelId).catch(() => null);

      if (channel?.isTextBased()) {
        for (const id of announcements) {
          await channel.messages.delete(id).catch(() => null);
        }
      }
    }

    return { refund: result.refund };
  }

  public static async prune() {
    const result = await prisma.tupperMessage.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000) } },
    });

    return result.count;
  }
}
