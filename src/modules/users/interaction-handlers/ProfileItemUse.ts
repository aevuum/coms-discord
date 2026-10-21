import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import {
  ContainerBuilder,
  MessageFlags,
  StringSelectMenuInteraction,
  TextDisplayBuilder,
} from "discord.js";

import { ShopFormatter } from "../../shop/lib/shopFormatter.js";
import { ShopService } from "../../shop/service/shopService.js";
import { ShopError } from "../../shop/types/shop.js";
import { CharacterCardContainer } from "../lib/characterCardContainer.js";

const PREFIX = "profile_item_";

export class ProfileItemUse extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.SelectMenu,
    });
  }

  public override parse(interaction: StringSelectMenuInteraction) {
    if (!interaction.customId.startsWith(PREFIX)) {
      return this.none();
    }

    return this.some({
      ownerId: interaction.customId.slice(PREFIX.length),
      itemId: interaction.values[0],
    });
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    result: {
      ownerId: string;
      itemId: string;
    },
  ) {
    if (interaction.user.id !== result.ownerId) {
      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [
          CharacterCardContainer.notice(
            "<:240191mark:1518581039172292688> Ошибка",
            "Использовать предметы может только владелец инвентаря.",
          ),
        ],
      });

      return;
    }

    try {
      const used = await ShopService.useItem(interaction.user.id, result.itemId);

      const container = new ContainerBuilder().setAccentColor(0x475b56);

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            "### <:527877discordlegendchest:1518587359136972930> Предмет использован",
            `<@${interaction.user.id}> использует ${ShopFormatter.title(used.item)}`,
            used.slotGranted
              ? "Получен слот для нового персонажа — теперь можно открыть тикет на регистрацию персонажа."
              : null,
            `-# Осталось: ${used.remaining} шт.`,
          ]
            .filter((line) => line !== null)
            .join("\n"),
        ),
      );

      await interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      if (!(error instanceof ShopError)) {
        this.container.logger.error(error);
      }

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [
          CharacterCardContainer.notice(
            "<:240191mark:1518581039172292688> Ошибка",
            error instanceof ShopError
              ? "У вас больше нет этого предмета."
              : "Произошла непредвиденная ошибка. Попробуйте позже.",
          ),
        ],
      });
    }
  }
}
