import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags } from "discord.js";

import { GradeBoardContainer } from "../lib/gradeBoardContainer.js";
import { ScheduleResponder } from "../lib/scheduleResponder.js";
import { GradeBoardService } from "../service/gradeBoardService.js";

export class GradeBoardButtonHandler extends InteractionHandler {
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
    const parsed = GradeBoardContainer.parse(interaction.customId);

    return parsed ? this.some(parsed) : this.none();
  }

  public override async run(interaction: ButtonInteraction, result: { month: string; page: number }) {
    const personal = interaction.message.flags.has(MessageFlags.Ephemeral);

    try {
      if (personal) {
        await interaction.deferUpdate();
      } else {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }

      const board = await GradeBoardService.render(result.month, result.page, true);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        ...(await board.build()),
        attachments: [],
      });
    } catch (error) {
      await ScheduleResponder.error(interaction, error);
    }
  }
}
