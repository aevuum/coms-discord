import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  LabelBuilder,
  ModalBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import type { ShopItem } from "../../../database/generated/prisma/client.js";

import { CoinFormatter } from "../../coins/lib/coinFormatter.js";
import { ManageComponents } from "../../manage/lib/manageComponents.js";
import type { InventoryEntry } from "../types/shop.js";
import {
  ShopAdminAction,
  ShopCustomIds,
  ShopModalFields,
} from "./shopCustomIds.js";
import { ShopFormatter } from "./shopFormatter.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const HEADER = "<:sec_shop:1562521793691131955>";

export class ShopAdminContainer {
  public static root(items: ShopItem[]) {
    const container = this.base(
      "Магазин",
      [
        `${ARROW} Товары продаются за комс-коины в /shop.`,
        "-# Скрытые товары не видны в магазине, но остаются у игроков в инвентаре.",
      ],
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        items.length
          ? items
              .map(
                (item) =>
                  `${item.isActive ? "" : "🚫 "}${ShopFormatter.title(item)} · ${CoinFormatter.amount(item.price)}${
                    item.maxPerUser !== null ? ` · лимит ${item.maxPerUser}` : ""
                  }`,
              )
              .join("\n")
          : `${ARROW} Товаров пока нет.`,
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    if (items.length) {
      container.addActionRowComponents(
        this.itemSelect(
          ShopCustomIds.admin(ShopAdminAction.Item),
          items,
          "Выберите товар для настройки",
        ),
      );
    }

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(ShopCustomIds.admin(ShopAdminAction.Create))
          .setLabel("Создать товар")
          .setEmoji("<:6509addguild:1518587247769817088>")
          .setStyle(ButtonStyle.Success),

        ManageComponents.memberSearchButton(
          ShopCustomIds.admin(ShopAdminAction.Inventory),
          "Инвентарь игрока",
        ),

        ManageComponents.homeButton(),
      ),
    );

    return container;
  }

  public static item(item: ShopItem) {
    const container = this.base(ShopFormatter.title(item), [
      item.description ? `> ${item.description}` : null,
      `${ARROW} Цена: ${CoinFormatter.amount(item.price)}`,
      `${ARROW} Лимит на игрока: **${item.maxPerUser ?? "нет"}**`,
      `${ARROW} В магазине: **${item.isActive ? "продаётся" : "скрыт"}**`,
      `${ARROW} Слот для доп. персонажа: **${item.grantsCharacterSlot ? "даёт" : "нет"}**`,
      item.grantsCharacterSlot
        ? "-# После использования игрок может открыть тикет на ещё одного персонажа."
        : null,
    ]);

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(ShopCustomIds.admin(ShopAdminAction.Edit, item.id))
          .setLabel("Изменить")
          .setEmoji("<:479873settingsna:1518581042456432791>")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId(ShopCustomIds.admin(ShopAdminAction.Toggle, item.id))
          .setLabel(item.isActive ? "Скрыть" : "Вернуть в продажу")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId(ShopCustomIds.admin(ShopAdminAction.ToggleSlot, item.id))
          .setLabel(item.grantsCharacterSlot ? "Не давать слот" : "Даёт слот персонажа")
          .setEmoji("<:928205membericon:1518581050555633674>")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId(ShopCustomIds.admin(ShopAdminAction.Delete, item.id))
          .setLabel("Удалить")
          .setEmoji("<:14605delete:1518587266505642074>")
          .setStyle(ButtonStyle.Danger),

        this.backButton(),
      ),
    );

    return container;
  }

  public static deleteConfirm(item: ShopItem) {
    const container = this.base("Удаление товара", [
      `${ARROW} Удалить ${ShopFormatter.title(item)}?`,
      "-# Предмет пропадёт и у всех игроков из инвентаря. Чтобы только убрать его из продажи, используйте «Скрыть».",
    ]);

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(ShopCustomIds.admin(ShopAdminAction.DeleteConfirm, item.id))
          .setLabel("Удалить навсегда")
          .setEmoji("<:14605delete:1518587266505642074>")
          .setStyle(ButtonStyle.Danger),

        this.backButton("Отмена"),
      ),
    );

    return container;
  }

  public static player(
    memberName: string,
    discordId: string,
    balance: number,
    inventory: InventoryEntry[],
    items: ShopItem[],
    notice?: string,
  ) {
    const container = this.base(`Инвентарь · ${memberName}`, [
      notice ? `<:312537mark:1518581040548024430> ${notice}` : null,
      `${ARROW} Баланс: ${CoinFormatter.amount(balance)}`,
    ]);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        inventory.length
          ? inventory
              .map(
                (entry) =>
                  `${ShopFormatter.title(entry.shopItem)} × **${entry.quantity}**`,
              )
              .join("\n")
          : `${ARROW} Инвентарь пуст.`,
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    if (items.length) {
      container.addActionRowComponents(
        this.itemSelect(
          ShopCustomIds.admin(ShopAdminAction.Give, discordId),
          items,
          "Выдать предмет (+1)",
        ),
      );
    }

    if (inventory.length) {
      container.addActionRowComponents(
        this.itemSelect(
          ShopCustomIds.admin(ShopAdminAction.Take, discordId),
          inventory.map((entry) => entry.shopItem),
          "Забрать предмет (−1)",
        ),
      );
    }

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        this.backButton(),
        ManageComponents.homeButton(),
      ),
    );

    return container;
  }

  public static result(title: string, message: string) {
    const container = this.base(title, [`${ARROW} ${message}`]);

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        this.backButton(),
        ManageComponents.homeButton(),
      ),
    );

    return container;
  }

  public static itemModal(item?: ShopItem) {
    const input = (
      customId: string,
      style: TextInputStyle,
      required: boolean,
      maxLength: number,
      value: string | null | undefined,
      placeholder?: string,
    ) => {
      const builder = new TextInputBuilder()
        .setCustomId(customId)
        .setStyle(style)
        .setRequired(required)
        .setMaxLength(maxLength);

      if (value) builder.setValue(value);
      if (placeholder) builder.setPlaceholder(placeholder);

      return builder;
    };

    return new ModalBuilder()
      .setCustomId(
        item
          ? ShopCustomIds.admin(ShopAdminAction.EditModal, item.id)
          : ShopCustomIds.admin(ShopAdminAction.CreateModal),
      )
      .setTitle(item ? "Изменение товара" : "Новый товар")
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Название")
          .setTextInputComponent(
            input(ShopModalFields.Name, TextInputStyle.Short, true, 80, item?.name, "Реролл расы"),
          ),
        new LabelBuilder()
          .setLabel("Эмодзи")
          .setDescription("Необязательно: 🎲 или <:name:id>")
          .setTextInputComponent(
            input(ShopModalFields.Emoji, TextInputStyle.Short, false, 80, item?.emoji),
          ),
        new LabelBuilder()
          .setLabel("Описание")
          .setTextInputComponent(
            input(ShopModalFields.Description, TextInputStyle.Paragraph, false, 300, item?.description),
          ),
        new LabelBuilder()
          .setLabel("Цена в комс-коинах")
          .setTextInputComponent(
            input(ShopModalFields.Price, TextInputStyle.Short, true, 7, item ? String(item.price) : null, "500"),
          ),
        new LabelBuilder()
          .setLabel("Лимит на игрока")
          .setDescription("Пусто — без ограничений")
          .setTextInputComponent(
            input(
              ShopModalFields.Limit,
              TextInputStyle.Short,
              false,
              4,
              item?.maxPerUser !== null && item?.maxPerUser !== undefined
                ? String(item.maxPerUser)
                : null,
            ),
          ),
      );
  }

  private static itemSelect(customId: string, items: ShopItem[], placeholder: string) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder(placeholder)
        .addOptions(
          items.slice(0, 25).map((item) =>
            ShopFormatter.applyEmoji(
              new StringSelectMenuOptionBuilder()
                .setLabel(item.name.slice(0, 100))
                .setDescription(
                  `${item.price} комс-коинов${item.isActive ? "" : " · скрыт"}`,
                )
                .setValue(item.id),
              item.emoji,
            ),
          ),
        ),
    );
  }

  private static base(title: string, lines: (string | null)[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [`# ${HEADER} ${title}`, "", ...lines.filter((line) => line !== null)].join(
          "\n",
        ),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    return container;
  }

  private static backButton(label = "К товарам") {
    return new ButtonBuilder()
      .setCustomId(ShopCustomIds.admin(ShopAdminAction.Root))
      .setLabel(label)
      .setEmoji("<:26204blackarrow:1518587278467792997>")
      .setStyle(ButtonStyle.Secondary);
  }
}
