import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, StringSelectMenuInteraction } from "discord.js";

import { EconomyAction, EconomyCustomIds } from "../lib/economyCustomIds.js";
import { EconomyContainer } from "../lib/economyContainer.js";
import { EconomyService } from "../services/economyService.js";

export class EconomyTransferUserSelectHandler extends InteractionHandler {
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
    const parsed = EconomyCustomIds.parse(interaction.customId);

    if (!parsed || parsed.action !== EconomyAction.TransferUser) {
      return this.none();
    }

    return this.some({
      senderId: parsed.args[0],
      receiverDiscordId: interaction.values[0],
    });
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    result: {
      senderId: string;
      receiverDiscordId: string;
    },
  ) {
    try {
      const characters = await EconomyService.getUserCharactersByDiscordId(
        result.receiverDiscordId,
      );

      if (!characters.length) {
        await interaction.reply({
          content: "У выбранного пользователя нет персонажей.",
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,

        components: [
          EconomyContainer.selectTransferCharacter(characters, result.senderId),
        ],
      });
    } catch (error) {
      console.error(error);

      await interaction.reply({
        content: "Не удалось загрузить персонажей пользователя.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
}
