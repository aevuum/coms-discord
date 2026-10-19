import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { MessageFlags, type ButtonInteraction } from "discord.js";

import { GiveawayContainer } from "../lib/giveawayContainer.js";
import { GiveawayCustomIds } from "../lib/giveawayCustomIds.js";
import { GiveawayService } from "../service/giveawayService.js";
import { GiveawayError } from "../types/giveaway.js";

export class GiveawayJoinHandler extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button,
    });
  }

  public override parse(interaction: ButtonInteraction) {
    const giveawayId = GiveawayCustomIds.parseJoin(interaction.customId);

    return giveawayId ? this.some(giveawayId) : this.none();
  }

  public override async run(interaction: ButtonInteraction, giveawayId: string) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      if (!interaction.inGuild()) {
        throw new GiveawayError("Участвовать можно только на сервере.");
      }

      const { giveaway, joined } = await GiveawayService.toggleEntry(giveawayId, interaction.user.id);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          joined
            ? GiveawayContainer.success(`Вы участвуете в розыгрыше **${giveaway.prize}**. Удачи! Нажмите кнопку ещё раз, чтобы выйти.`)
            : GiveawayContainer.success(`Вы вышли из розыгрыша **${giveaway.prize}**.`),
        ],
      });
    } catch (error) {
      if (!(error instanceof GiveawayError)) {
        this.container.logger.error(error);
      }

      await interaction
        .editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [
            GiveawayContainer.error(
              error instanceof GiveawayError ? error.message : "Не удалось обработать участие. Попробуйте позже.",
            ),
          ],
        })
        .catch(() => null);
    }
  }
}
