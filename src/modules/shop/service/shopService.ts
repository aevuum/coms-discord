import type { BaseInteraction } from "discord.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { CoinRepository } from "../../coins/repositories/coinRepository.js";
import { ShopRepository } from "../repositories/shopRepository.js";
import {
  ShopError,
  type ShopItemData,
  type ShopItemInput,
} from "../types/shop.js";

export class ShopService {
  public static readonly MANAGE_KEY = "manage.shop";

  private static readonly MAX_PRICE = 1_000_000;

  private static readonly MAX_LIMIT = 1000;

  private static readonly CUSTOM_EMOJI = /^<a?:[a-zA-Z0-9_]+:\d+>$/;

  private static readonly UNICODE_EMOJI =
    /^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji_Modifier}|\p{Emoji_Component}|️|‍)+$/u;

  public static async assertCanManage(interaction: BaseInteraction) {
    const subject = await PermissionService.resolveSubject(interaction);

    if (!(await PermissionService.canUse(subject, this.MANAGE_KEY))) {
      throw new ShopError("У вас нет доступа к управлению магазином.");
    }
  }

  public static async getStorefront(discordId: string) {
    return {
      items: await ShopRepository.listItems(true),
      balance: await CoinRepository.getBalance(discordId),
    };
  }

  public static async listAllItems() {
    return ShopRepository.listItems(false);
  }

  public static async getItem(itemId: string, activeOnly = false) {
    const item = itemId ? await ShopRepository.getItem(itemId) : null;

    if (!item || (activeOnly && !item.isActive)) {
      throw new ShopError("Товар не найден.");
    }

    return item;
  }

  public static async getItemView(discordId: string, itemId: string) {
    const item = await this.getItem(itemId, true);

    const inventory = await ShopRepository.getInventory(discordId);

    return {
      item,
      balance: await CoinRepository.getBalance(discordId),
      owned:
        inventory.find((entry) => entry.shopItemId === item.id)?.quantity ?? 0,
    };
  }

  public static async getPlayerAdminView(discordId: string) {
    return {
      balance: await CoinRepository.getBalance(discordId),
      inventory: await ShopRepository.getInventory(discordId),
      items: await ShopRepository.listItems(false),
    };
  }

  public static async purchase(discordId: string, itemId: string) {
    return ShopRepository.purchase(discordId, itemId);
  }

  public static async getInventory(discordId: string) {
    return ShopRepository.getInventory(discordId);
  }

  public static async useItem(discordId: string, itemId: string) {
    const item = await this.getItem(itemId);

    const remaining = await ShopRepository.changeQuantity(discordId, item.id, -1);

    return {
      item,
      remaining,
    };
  }

  public static async adminGive(discordId: string, itemId: string) {
    const item = await this.getItem(itemId);

    return {
      item,
      quantity: await ShopRepository.changeQuantity(discordId, item.id, 1),
    };
  }

  public static async adminTake(discordId: string, itemId: string) {
    const item = await this.getItem(itemId);

    return {
      item,
      quantity: await ShopRepository.changeQuantity(discordId, item.id, -1),
    };
  }

  public static async createItem(input: ShopItemInput) {
    return ShopRepository.createItem(this.parseInput(input));
  }

  public static async updateItem(itemId: string, input: ShopItemInput) {
    const item = await this.getItem(itemId);

    return ShopRepository.updateItem(item.id, this.parseInput(input));
  }

  public static async toggleItem(itemId: string) {
    const item = await this.getItem(itemId);

    return ShopRepository.setActive(item.id, !item.isActive);
  }

  public static async deleteItem(itemId: string) {
    const item = await this.getItem(itemId);

    await ShopRepository.deleteItem(item.id);

    return item;
  }

  private static parseInput(input: ShopItemInput): ShopItemData {
    const name = input.name.trim();

    if (name.length < 2 || name.length > 80) {
      throw new ShopError("Название должно быть от 2 до 80 символов.");
    }

    const emoji = input.emoji.trim();

    if (
      emoji &&
      !this.CUSTOM_EMOJI.test(emoji) &&
      !this.UNICODE_EMOJI.test(emoji)
    ) {
      throw new ShopError("Некорректный эмодзи. Пример: 🎲 или <:name:id>");
    }

    const description = input.description.trim();

    if (description.length > 300) {
      throw new ShopError("Описание не может быть длиннее 300 символов.");
    }

    const priceText = input.price.trim();

    if (!/^\d+$/.test(priceText) || Number(priceText) > this.MAX_PRICE) {
      throw new ShopError(
        `Цена должна быть целым числом от 0 до ${this.MAX_PRICE}.`,
      );
    }

    const limitText = input.maxPerUser.trim();

    let maxPerUser: number | null = null;

    if (limitText) {
      if (
        !/^\d+$/.test(limitText) ||
        Number(limitText) < 1 ||
        Number(limitText) > this.MAX_LIMIT
      ) {
        throw new ShopError(
          `Лимит на игрока должен быть от 1 до ${this.MAX_LIMIT} или пустым.`,
        );
      }

      maxPerUser = Number(limitText);
    }

    return {
      name,
      emoji: emoji || null,
      description: description || null,
      price: Number(priceText),
      maxPerUser,
    };
  }
}
