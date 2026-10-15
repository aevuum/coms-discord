import prisma from "../../../database/prisma.js";

import {
  CoinTransactionType,
  ShopCurrency,
} from "../../../database/generated/prisma/client.js";

import { CoinRepository } from "../../coins/repositories/coinRepository.js";
import { ShopError, type ShopItemData } from "../types/shop.js";

export class ShopRepository {
  public static async listItems(activeOnly: boolean) {
    return prisma.shopItem.findMany({
      where: {
        currency: ShopCurrency.COMS_COINS,
        ...(activeOnly ? { isActive: true } : {}),
      },

      orderBy: [{ price: "asc" }, { name: "asc" }],
    });
  }

  public static async getItem(id: string) {
    return prisma.shopItem.findFirst({
      where: {
        id,
        currency: ShopCurrency.COMS_COINS,
      },
    });
  }

  public static async createItem(data: ShopItemData) {
    return prisma.shopItem.create({
      data: {
        ...data,
        currency: ShopCurrency.COMS_COINS,
      },
    });
  }

  public static async updateItem(id: string, data: ShopItemData) {
    return prisma.shopItem.update({
      where: {
        id,
      },

      data,
    });
  }

  public static async setActive(id: string, isActive: boolean) {
    return prisma.shopItem.update({
      where: {
        id,
      },

      data: {
        isActive,
      },
    });
  }

  public static async deleteItem(id: string) {
    return prisma.shopItem.delete({
      where: {
        id,
      },
    });
  }

  public static async getInventory(discordId: string) {
    return prisma.inventoryItem.findMany({
      where: {
        user: {
          discordId,
        },

        shopItem: {
          currency: ShopCurrency.COMS_COINS,
        },

        quantity: {
          gt: 0,
        },
      },

      include: {
        shopItem: true,
      },

      orderBy: {
        createdAt: "asc",
      },
    });
  }

  public static async purchase(discordId: string, itemId: string) {
    return prisma.$transaction(async (tx) => {
      const item = await tx.shopItem.findFirst({
        where: {
          id: itemId,
          isActive: true,
          currency: ShopCurrency.COMS_COINS,
        },
      });

      if (!item) {
        throw new ShopError("Этот товар больше не продаётся.");
      }

      const user = await CoinRepository.ensureUser(tx, discordId);

      const owned = await tx.inventoryItem.findUnique({
        where: {
          userId_shopItemId: {
            userId: user.id,
            shopItemId: item.id,
          },
        },
      });

      if (item.maxPerUser !== null && (owned?.quantity ?? 0) >= item.maxPerUser) {
        throw new ShopError(
          `Можно иметь не больше ${item.maxPerUser} шт. этого товара.`,
        );
      }

      const balance = await CoinRepository.applyInTransaction(
        tx,
        user.id,
        user.walletId,
        -item.price,
        CoinTransactionType.PURCHASE,
        `Покупка: ${item.name}`,
      );

      if (balance === null) {
        throw new ShopError("Недостаточно комс-коинов.");
      }

      const inventory = await tx.inventoryItem.upsert({
        where: {
          userId_shopItemId: {
            userId: user.id,
            shopItemId: item.id,
          },
        },

        update: {
          quantity: {
            increment: 1,
          },
        },

        create: {
          userId: user.id,
          shopItemId: item.id,
          quantity: 1,
        },
      });

      return {
        item,
        balance,
        quantity: inventory.quantity,
      };
    });
  }

  public static async changeQuantity(
    discordId: string,
    itemId: string,
    delta: number,
  ) {
    return prisma.$transaction(async (tx) => {
      const user = await CoinRepository.ensureUser(tx, discordId);

      if (delta > 0) {
        const inventory = await tx.inventoryItem.upsert({
          where: {
            userId_shopItemId: {
              userId: user.id,
              shopItemId: itemId,
            },
          },

          update: {
            quantity: {
              increment: delta,
            },
          },

          create: {
            userId: user.id,
            shopItemId: itemId,
            quantity: delta,
          },
        });

        return inventory.quantity;
      }

      const updated = await tx.inventoryItem.updateMany({
        where: {
          userId: user.id,
          shopItemId: itemId,
          quantity: {
            gte: -delta,
          },
        },

        data: {
          quantity: {
            increment: delta,
          },
        },
      });

      if (updated.count === 0) {
        throw new ShopError("У игрока нет этого предмета.");
      }

      const inventory = await tx.inventoryItem.findUniqueOrThrow({
        where: {
          userId_shopItemId: {
            userId: user.id,
            shopItemId: itemId,
          },
        },
      });

      if (inventory.quantity <= 0) {
        await tx.inventoryItem.delete({
          where: {
            id: inventory.id,
          },
        });
      }

      return Math.max(inventory.quantity, 0);
    });
  }
}
