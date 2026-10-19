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

import { TicketContainer } from "../lib/ticketContainer.js";
import { TicketAction, TicketCustomIds } from "../lib/ticketCustomIds.js";
import { TicketService } from "../service/ticketService.js";
import { TicketError } from "../types/ticket.js";

export class TicketOpenSelectHandler extends InteractionHandler {
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
    const parsed = TicketCustomIds.parse(interaction.customId);

    if (parsed?.action !== TicketAction.Open) {
      return this.none();
    }

    return this.some(interaction.values[0]);
  }

  public override async run(interaction: StringSelectMenuInteraction, tagId: string) {
    const reset = await SelectReset.reset(interaction).catch((error) => {
      this.container.logger.error(error);
      return interaction.deferred || interaction.replied;
    });

    if (!reset) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => null);
    }

    try {
      if (!interaction.inCachedGuild()) {
        throw new TicketError("Тикеты можно открыть только на сервере.");
      }

      const { url, subject } = await TicketService.open(interaction.member, tagId);

      await this.respond(interaction, reset, TicketContainer.created(subject.name, url));
    } catch (error) {
      if (!(error instanceof TicketError)) {
        this.container.logger.error(error);
      }

      await this.respond(
        interaction,
        reset,
        TicketContainer.error(
          error instanceof TicketError ? error.message : "Произошла непредвиденная ошибка. Попробуйте позже.",
        ),
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
