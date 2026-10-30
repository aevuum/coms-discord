import {
  CoinTransactionType,
  HalloweenDropStatus,
  Prisma,
  type HalloweenSettings,
} from "../../../database/generated/prisma/client.js";

import prisma from "../../../database/prisma.js";
import { CoinRepository } from "../../coins/repositories/coinRepository.js";
import { CANDY, EVENT_CURRENCY_CATEGORY, HalloweenError, PUMPKIN, PUMPKIN_LIMIT } from "../types/halloween.js";

export enum ClaimResult {
  Granted = "granted",
  Taken = "taken",
  Limit = "limit",
}

class LimitReached extends Error {}

type Tx = Prisma.TransactionClient;

export class HalloweenRepository {
  public static settings(guildId: string) {
    return prisma.halloweenSettings.findUnique({ where: { guildId } });
  }

  public static allEnabled() {
    return prisma.halloweenSettings.findMany({ where: { enabled: true } });
  }

  public static save(guildId: string, data: Prisma.HalloweenSettingsUncheckedUpdateInput) {
    return prisma.halloweenSettings.upsert({
      where: { guildId },
      create: { ...(data as Prisma.HalloweenSettingsUncheckedCreateInput), guildId },
      update: data,
    });
  }

  public static async ensureItems(guildId: string): Promise<HalloweenSettings & { candyItemId: string; pumpkinItemId: string }> {
    const settings = (await this.settings(guildId)) ?? (await this.save(guildId, {}));
    const existing = await prisma.shopItem.findMany({
      where: { id: { in: [settings.candyItemId, settings.pumpkinItemId].filter((id): id is string => Boolean(id)) } },
      select: { id: true },
    });
    const has = (id: string | null) => Boolean(id && existing.some((item) => item.id === id));

    const candy = has(settings.candyItemId)
      ? settings.candyItemId!
      : (
          await prisma.shopItem.create({
            data: {
              name: "Конфеты",
              emoji: CANDY,
              description: "Хэллоуинские конфеты. Тратятся в лавке /halloween или меняются на комс-коины.",
              price: 0,
              isActive: false,
              category: EVENT_CURRENCY_CATEGORY,
            },
          })
        ).id;

    const pumpkin = has(settings.pumpkinItemId)
      ? settings.pumpkinItemId!
      : (
          await prisma.shopItem.create({
            data: {
              name: "Тыква-артефакт",
              emoji: PUMPKIN,
              description: "Выдаётся за выбор «жизни». Тратится в лавке /halloween или меняется на комс-коины.",
              price: 0,
              isActive: false,
              category: EVENT_CURRENCY_CATEGORY,
              maxPerUser: PUMPKIN_LIMIT,
            },
          })
        ).id;

    if (candy === settings.candyItemId && pumpkin === settings.pumpkinItemId) {
      return { ...settings, candyItemId: candy, pumpkinItemId: pumpkin };
    }

    const saved = await this.save(guildId, { candyItemId: candy, pumpkinItemId: pumpkin });

    return { ...saved, candyItemId: candy, pumpkinItemId: pumpkin };
  }

  public static async quantity(discordId: string, shopItemId: string) {
    const row = await prisma.inventoryItem.findFirst({ where: { user: { discordId }, shopItemId }, select: { quantity: true } });

    return row?.quantity ?? 0;
  }

  public static createDrop(data: { guildId: string; channelId: string; messageId: string; expiresAt: Date }) {
    return prisma.halloweenDrop.create({ data });
  }

  public static openDrop(messageId: string) {
    return prisma.halloweenDrop.findFirst({ where: { messageId, status: HalloweenDropStatus.OPEN } });
  }

  public static hasOpenDrop(guildId: string) {
    return prisma.halloweenDrop.count({ where: { guildId, status: HalloweenDropStatus.OPEN } }).then((count) => count > 0);
  }

  public static async expireDue(now: Date) {
    const due = await prisma.halloweenDrop.findMany({ where: { status: HalloweenDropStatus.OPEN, expiresAt: { lte: now } } });

    if (due.length) {
      await prisma.halloweenDrop.updateMany({
        where: { id: { in: due.map((drop) => drop.id) }, status: HalloweenDropStatus.OPEN },
        data: { status: HalloweenDropStatus.EXPIRED },
      });
    }

    return due;
  }

  public static async claim(dropId: string, discordId: string, choice: string, shopItemId: string, amount: number, limit: number | null) {
    try {
      return await prisma.$transaction(async (tx) => {
        const user = await CoinRepository.ensureUser(tx, discordId);

        if (limit !== null && (await this.held(tx, user.id, shopItemId)) + amount > limit) {
          throw new LimitReached();
        }

        const claimed = await tx.halloweenDrop.updateMany({
          where: { id: dropId, status: HalloweenDropStatus.OPEN, expiresAt: { gt: new Date() } },
          data: { status: HalloweenDropStatus.CLAIMED, winnerId: discordId, choice, reward: amount },
        });

        if (!claimed.count) {
          return ClaimResult.Taken;
        }

        const row = await this.add(tx, user.id, shopItemId, amount);

        if (limit !== null && row.quantity > limit) {
          throw new LimitReached();
        }

        return ClaimResult.Granted;
      });
    } catch (error) {
      if (error instanceof LimitReached) {
        return ClaimResult.Limit;
      }

      throw error;
    }
  }

  public static exchange(discordId: string, shopItemId: string, amount: number, rate: number, label: string) {
    return prisma.$transaction(async (tx) => {
      const user = await CoinRepository.ensureUser(tx, discordId);

      await this.spend(tx, user.id, shopItemId, amount, `Не хватает: ${label}.`);

      const balance = await CoinRepository.applyInTransaction(
        tx,
        user.id,
        user.walletId,
        amount * rate,
        CoinTransactionType.EVENT_EXCHANGE,
        `Хэллоуин: обмен ${amount} × ${label}`,
      );

      return { coins: amount * rate, balance: balance ?? 0 };
    });
  }

  public static buy(discordId: string, offerId: string, candyItemId: string, pumpkinItemId: string) {
    return prisma.$transaction(async (tx) => {
      const offer = await tx.halloweenOffer.findUnique({ where: { id: offerId } });
      const item = offer ? await tx.shopItem.findUnique({ where: { id: offer.shopItemId } }) : null;

      if (!offer || !item) {
        throw new HalloweenError("Этого товара больше нет в лавке.");
      }

      const user = await CoinRepository.ensureUser(tx, discordId);

      if (item.maxPerUser !== null && (await this.held(tx, user.id, item.id)) >= item.maxPerUser) {
        throw new HalloweenError(`Можно иметь не больше ${item.maxPerUser} шт. «${item.name}».`);
      }

      if (offer.candyPrice > 0) {
        await this.spend(tx, user.id, candyItemId, offer.candyPrice, "Не хватает конфет.");
      }

      if (offer.pumpkinPrice > 0) {
        await this.spend(tx, user.id, pumpkinItemId, offer.pumpkinPrice, "Не хватает тыкв-артефактов.");
      }

      await this.add(tx, user.id, item.id, 1);

      return item;
    });
  }

  public static offers() {
    return prisma.halloweenOffer
      .findMany({ orderBy: { createdAt: "asc" }, take: 25 })
      .then(async (offers) => {
        const items = await prisma.shopItem.findMany({ where: { id: { in: offers.map((offer) => offer.shopItemId) } } });

        return offers.flatMap((offer) => {
          const item = items.find((entry) => entry.id === offer.shopItemId);
          return item ? [{ ...offer, item }] : [];
        });
      });
  }

  public static saveOffer(shopItemId: string, candyPrice: number, pumpkinPrice: number) {
    return prisma.halloweenOffer.upsert({
      where: { shopItemId },
      create: { shopItemId, candyPrice, pumpkinPrice },
      update: { candyPrice, pumpkinPrice },
    });
  }

  public static removeOffer(id: string) {
    return prisma.halloweenOffer.deleteMany({ where: { id } });
  }

  public static shopItem(id: string) {
    return prisma.shopItem.findUnique({ where: { id } });
  }

  public static offerFor(shopItemId: string) {
    return prisma.halloweenOffer.findUnique({ where: { shopItemId } });
  }

  public static offerCandidates() {
    return prisma.shopItem.findMany({
      where: { category: { not: EVENT_CURRENCY_CATEGORY } },
      orderBy: { createdAt: "desc" },
      take: 25,
    });
  }

  private static async held(tx: Tx, userId: string, shopItemId: string) {
    const row = await tx.inventoryItem.findUnique({ where: { userId_shopItemId: { userId, shopItemId } }, select: { quantity: true } });

    return row?.quantity ?? 0;
  }

  private static add(tx: Tx, userId: string, shopItemId: string, amount: number) {
    return tx.inventoryItem.upsert({
      where: { userId_shopItemId: { userId, shopItemId } },
      create: { userId, shopItemId, quantity: amount },
      update: { quantity: { increment: amount } },
    });
  }

  private static async spend(tx: Tx, userId: string, shopItemId: string, amount: number, message: string) {
    const spent = await tx.inventoryItem.updateMany({
      where: { userId, shopItemId, quantity: { gte: amount } },
      data: { quantity: { decrement: amount } },
    });

    if (!spent.count) {
      throw new HalloweenError(message);
    }
  }
}
