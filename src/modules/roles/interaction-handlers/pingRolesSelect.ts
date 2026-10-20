import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import {
  MessageFlags,
  type ContainerBuilder,
  type StringSelectMenuInteraction,
} from "discord.js";

import { SelectReset } from "../../../lib/selectReset.js";
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
    const reset = await SelectReset.reset(interaction).catch((error) => {
      this.container.logger.error(error);
      return interaction.deferred || interaction.replied;
    });

    if (!reset) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => null);
    }

    try {
      if (!interaction.inCachedGuild()) {
        throw new Error("Ping roles interaction outside of a cached guild");
      }

      const result = await PingRolesService.apply(interaction.member, interaction.values);

      await this.respond(
        interaction,
        reset,
        PingRolesContainer.result(result.added, result.removed, result.current),
      );
    } catch (error) {
      this.container.logger.error(error);

      await this.respond(
        interaction,
        reset,
        PingRolesContainer.error("Не удалось обновить роли. Попробуйте позже."),
      ).catch(() => null);
    }
  }

  private async respond(interaction: StringSelectMenuInteraction, reset: boolean, container: ContainerBuilder) {
    if (!reset) {
      await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
      return;
    }

    await interaction.followUp({
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      components: [container],
    });
  }
}
