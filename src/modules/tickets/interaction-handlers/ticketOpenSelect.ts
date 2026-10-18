import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import {
  MessageFlags,
  type StringSelectMenuInteraction,
} from "discord.js";

import { TicketContainer } from "../lib/ticketContainer.js";
import { TicketAction, TicketCustomIds } from "../lib/ticketCustomIds.js";
import { TicketResponder } from "../lib/ticketResponder.js";
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
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      if (!interaction.inCachedGuild()) {
        throw new TicketError("Тикеты можно открыть только на сервере.");
      }

      const { url, subject } = await TicketService.open(interaction.member, tagId);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [TicketContainer.created(subject.name, url)],
      });
    } catch (error) {
      await TicketResponder.error(interaction, error);
    }
  }
}
