import prisma from "../../../database/prisma.js";

import { CoinRepository } from "../../coins/repositories/coinRepository.js";

export type SlotSource = "credit" | "item";

export class CharacterSlotRepository {
  public static countActiveCharacters(discordId: string) {
    return prisma.character.count({
      where: {
        user: { discordId },
        status: { in: ["ALIVE", "FROZEN"] },
      },
    });
  }

  public static countCreatedSince(discordId: string, since: Date) {
    return prisma.character.count({
      where: {
        user: { discordId },
        createdAt: { gte: since },
      },
    });
  }

  public static getSlotItem() {
    return prisma.shopItem.findFirst({
      where: { grantsCharacterSlot: true },
      orderBy: { createdAt: "asc" },
    });
  }

  public static async getSlots(discordId: string) {
    const user = await prisma.user.findUnique({
      where: { discordId },
      select: { characterSlots: true },
    });

    return user?.characterSlots ?? 0;
  }

  public static async claim(discordId: string): Promise<SlotSource | null> {
    return prisma.$transaction(async (tx) => {
      const user = await CoinRepository.ensureUser(tx, discordId);

      const credit = await tx.user.updateMany({
        where: { id: user.id, characterSlots: { gt: 0 } },
        data: { characterSlots: { decrement: 1 } },
      });

      if (credit.count) {
        return "credit";
      }

      const item = await tx.inventoryItem.findFirst({
        where: {
          userId: user.id,
          quantity: { gte: 1 },
          shopItem: { grantsCharacterSlot: true },
        },
      });

      if (!item) {
        return null;
      }

      const taken = await tx.inventoryItem.updateMany({
        where: { id: item.id, quantity: { gte: 1 } },
        data: { quantity: { decrement: 1 } },
      });

      if (!taken.count) {
        return null;
      }

      await tx.inventoryItem.deleteMany({ where: { id: item.id, quantity: { lte: 0 } } });

      return "item";
    });
  }

  public static async refund(discordId: string) {
    await prisma.user.updateMany({
      where: { discordId },
      data: { characterSlots: { increment: 1 } },
    });
  }
}
