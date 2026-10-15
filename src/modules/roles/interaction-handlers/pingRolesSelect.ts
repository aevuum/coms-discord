import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import {
  MessageFlags,
  type StringSelectMenuInteraction,
} from "discord.js";

import { PingRolesCustomIds } from "../lib/pingRoles.js";
import { PingRolesContainer } from "../lib/pingRolesContainer.js";
import { PingRolesService } from "../service/pingRolesService.js";

export class PingRolesSelectHandler extends InteractionHandler {
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
    if (interaction.customId !== PingRolesCustomIds.select) {
      return this.none();
    }

    return this.some();
  }

  public override async run(interaction: StringSelectMenuInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      if (!interaction.inCachedGuild()) {
        throw new Error("Ping roles interaction outside of a cached guild");
      }

      const result = await PingRolesService.apply(
        interaction.member,
        interaction.values,
      );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          PingRolesContainer.result(result.added, result.removed, result.current),
        ],
      });
    } catch (error) {
      this.container.logger.error(error);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          PingRolesContainer.error("Не удалось обновить роли. Попробуйте позже."),
        ],
      });
    }
  }
}
