import prisma from "../../../database/prisma.js";

import {
  CharacterStatus,
  TransactionType,
} from "../../../database/generated/prisma/client.js";

import { EconomyError, type TransferParams } from "../types/economy.js";

export class EconomyRepository {
  public static async getCharacter(id: string) {
    return prisma.character.findUnique({
      where: {
        id,
      },

      include: {
        user: {
          select: {
            discordId: true,
          },
        },
      },
    });
  }

  public static async getUserCharacters(userId: string) {
    return prisma.character.findMany({
      where: {
        userId,
      },

      orderBy: {
        createdAt: "asc",
      },
    });
  }

  public static async transfer(params: TransferParams) {
    return prisma.$transaction(async (tx) => {
      const debited = await tx.character.updateMany({
        where: {
          id: params.senderId,
          status: CharacterStatus.ALIVE,
          balanceKnuts: {
            gte: params.amountKnuts,
          },
        },

        data: {
          balanceKnuts: {
            decrement: params.amountKnuts,
          },
        },
      });

      if (debited.count === 0) {
        throw new EconomyError(
          "Недостаточно средств или персонаж-отправитель недоступен.",
        );
      }

      const credited = await tx.character.updateMany({
        where: {
          id: params.receiverId,
          status: CharacterStatus.ALIVE,
        },

        data: {
          balanceKnuts: {
            increment: params.amountKnuts,
          },
        },
      });

      if (credited.count === 0) {
        throw new EconomyError("Персонаж-получатель недоступен для перевода.");
      }

      const sender = await tx.character.findUniqueOrThrow({
        where: {
          id: params.senderId,
        },
      });

      const receiver = await tx.character.findUniqueOrThrow({
        where: {
          id: params.receiverId,
        },
      });

      await tx.characterTransaction.createMany({
        data: [
          {
            characterId: sender.id,
            type: TransactionType.TRANSFER_OUT,
            amountKnuts: -params.amountKnuts,
            balanceAfterKnuts: sender.balanceKnuts,
            reason: params.senderReason,
          },
          {
            characterId: receiver.id,
            type: TransactionType.TRANSFER_IN,
            amountKnuts: params.amountKnuts,
            balanceAfterKnuts: receiver.balanceKnuts,
            reason: params.receiverReason,
          },
        ],
      });

      return {
        sender,
        receiver,
      };
    });
  }
}
