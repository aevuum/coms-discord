import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
} from "discord.js";

import type { ShopItem } from "../../../database/generated/prisma/client.js";

import { CoinFormatter, COINS_EMOJI } from "../../coins/lib/coinFormatter.js";
import type { PurchaseResult } from "../types/shop.js";
import { ShopAction, ShopCustomIds } from "./shopCustomIds.js";
import { ShopFormatter } from "./shopFormatter.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const HEADER = "<:16874shopcyan:1518587268154134569>";

export class ShopContainer {
  public static storefront(items: ShopItem[], balance: number) {
    const container = new ContainerBuilder().setAccentColor(0x2ecc71);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${HEADER} Магазин`,
          "",
          `${ARROW} Ваш баланс: ${CoinFormatter.amount(balance)}`,
          "-# Купленные предметы появляются во вкладке «Инвентарь» в /profile.",
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        items.length
          ? items.map((item) => ShopFormatter.listEntry(item)).join("\n")
          : `${ARROW} Магазин пока пуст.`,
      ),
    );

    if (items.length) {
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
      );

      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(ShopCustomIds.shop(ShopAction.Item))
            .setPlaceholder("Выберите товар")
            .addOptions(
              items.slice(0, 25).map((item) =>
                ShopFormatter.applyEmoji(
                  new StringSelectMenuOptionBuilder()
                    .setLabel(item.name.slice(0, 100))
                    .setDescription(`${item.price} комс-коинов`)
                    .setValue(item.id),
                  item.emoji,
                ),
              ),
            ),
        ),
      );
    }

    return container;
  }

  public static item(item: ShopItem, balance: number, owned: number) {
    const container = new ContainerBuilder().setAccentColor(0x2ecc71);

    const limitReached = item.maxPerUser !== null && owned >= item.maxPerUser;

    const canAfford = balance >= item.price;

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${ShopFormatter.title(item)}`,
          item.description ? `> ${item.description}` : null,
          "",
          `${ARROW} Цена: ${CoinFormatter.amount(item.price)}`,
          `${ARROW} У вас: **${owned}** шт.${
            item.maxPerUser !== null ? ` (лимит ${item.maxPerUser})` : ""
          }`,
          `${ARROW} Баланс: ${CoinFormatter.amount(balance)}`,
          limitReached
            ? "-# Достигнут лимит на этот товар."
            : !canAfford
              ? `-# Не хватает ${item.price - balance} ${COINS_EMOJI}`
              : null,
        ]
          .filter((line) => line !== null)
          .join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(ShopCustomIds.shop(ShopAction.Buy, item.id))
          .setLabel(`Купить за ${item.price}`)
          .setEmoji(COINS_EMOJI)
          .setStyle(ButtonStyle.Success)
          .setDisabled(limitReached || !canAfford),

        this.homeButton(),
      ),
    );

    return container;
  }

  public static purchased(result: PurchaseResult) {
    const container = new ContainerBuilder().setAccentColor(0x2ecc71);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:766839verifiedgreen:1518587368636944534> Покупка совершена",
          "",
          `${ARROW} ${ShopFormatter.title(result.item)} теперь у вас: **${result.quantity}** шт.`,
          `${ARROW} Списано: ${CoinFormatter.amount(result.item.price)}`,
          `${ARROW} Остаток: ${CoinFormatter.amount(result.balance)}`,
          "-# Использовать предмет можно во вкладке «Инвентарь» в /profile.",
        ].join("\n"),
      ),
    );

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(this.homeButton()),
    );

    return container;
  }

  public static error(message: string) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:240191mark:1518581039172292688> Ошибка",
          "",
          `${ARROW} ${message}`,
        ].join("\n"),
      ),
    );

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(this.homeButton()),
    );

    return container;
  }

  private static homeButton() {
    return new ButtonBuilder()
      .setCustomId(ShopCustomIds.shop(ShopAction.Home))
      .setLabel("К магазину")
      .setEmoji("<:26204blackarrow:1518587278467792997>")
      .setStyle(ButtonStyle.Secondary);
  }
}
