import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, type ButtonInteraction } from "discord.js";

import { TravelAction, TravelCustomIds } from "../lib/locationCustomIds.js";
import { TravelContainer } from "../lib/travelContainer.js";
import { TravelResponder } from "../lib/travelResponder.js";
import { TravelService } from "../service/travelService.js";

export class TravelButtonHandler extends InteractionHandler {
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
    const parsed = TravelCustomIds.parse(interaction.customId);

    if (!parsed || parsed.action === TravelAction.Route) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ButtonInteraction,
    result: { action: TravelAction; args: string[] },
  ) {
    try {
      switch (result.action) {
        case TravelAction.Approve:
        case TravelAction.Reject:
          return await this.decide(interaction, result.action, result.args[0]);
      }

      const ephemeral = TravelResponder.isEphemeral(interaction);

      if (ephemeral) {
        await interaction.deferUpdate();
      } else {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }

      const member = await TravelService.getMember(interaction);

      if (result.action === TravelAction.Confirm) {
        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [await TravelService.start(member, result.args[0])],
        });

        return;
      }

      if (result.action === TravelAction.Cancel) {
        await TravelService.cancel(member);
      }

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [TravelContainer.guide(await TravelService.getGuide(member))],
      });
    } catch (error) {
      await TravelResponder.error(interaction, error);
    }
  }

  private async decide(interaction: ButtonInteraction, action: TravelAction, travelId: string) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (action === TravelAction.Approve) {
      await TravelService.approve(interaction, travelId);
    } else {
      await TravelService.reject(interaction, travelId);
    }

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        TravelContainer.success(
          action === TravelAction.Approve ? "Перемещение разрешено" : "Заявка отклонена",
          "Игрок получит уведомление в личные сообщения.",
        ),
      ],
    });
  }
}
