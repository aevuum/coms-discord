import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, type ButtonInteraction } from "discord.js";

import { TICKET_DELETE_DELAY_MS } from "../lib/ticketConfig.js";
import { TicketContainer } from "../lib/ticketContainer.js";
import { TicketAction, TicketCustomIds } from "../lib/ticketCustomIds.js";
import { TicketResponder } from "../lib/ticketResponder.js";
import { TicketService } from "../service/ticketService.js";
import { TicketError } from "../types/ticket.js";

export class TicketButtonHandler extends InteractionHandler {
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
    const parsed = TicketCustomIds.parse(interaction.customId);

    if (!parsed || parsed.action === TicketAction.Open) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ButtonInteraction,
    result: { action: TicketAction; args: string[] },
  ) {
    try {
      if (!interaction.inCachedGuild()) {
        throw new TicketError("Тикеты работают только на сервере.");
      }

      switch (result.action) {
        case TicketAction.Call:
          return await this.call(interaction);

        case TicketAction.Review:
          return await this.review(interaction, result.args[0]);

        case TicketAction.Close:
          await TicketService.assertCanClose(interaction.member, interaction.channelId);

          return await interaction.reply({
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
            components: [TicketContainer.closeConfirm()],
          });

        case TicketAction.CloseConfirm:
          return await this.close(interaction);

        case TicketAction.CloseCancel:
          return await interaction.update({
            flags: MessageFlags.IsComponentsV2,
            components: [TicketContainer.success("Отменено", "Тикет остаётся открытым.")],
          });
      }
    } catch (error) {
      await TicketResponder.error(interaction, error);
    }
  }

  private async call(interaction: ButtonInteraction<"cached">) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    await TicketService.call(interaction.member, interaction.channelId);

    if (interaction.channel?.isSendable()) {
      await interaction.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [TicketContainer.called()],
      });
    }

    await interaction.deleteReply().catch(() => null);
  }

  private async review(interaction: ButtonInteraction<"cached">, ticketId: string) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { url } = await TicketService.review(interaction.member, ticketId);

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [TicketContainer.reviewAccess(url)],
    });
  }

  private async close(interaction: ButtonInteraction<"cached">) {
    await interaction.deferUpdate();

    await TicketService.close(interaction.member, interaction.channelId);

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [TicketContainer.success("Тикет закрыт", "Канал скоро будет удалён.")],
    });

    if (interaction.channel?.isSendable()) {
      await interaction.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [
          TicketContainer.closing(interaction.user.id, TICKET_DELETE_DELAY_MS / 1000),
        ],
        allowedMentions: { parse: [] },
      });
    }
  }
}
