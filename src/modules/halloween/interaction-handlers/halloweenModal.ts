import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, ModalSubmitInteraction } from "discord.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { HalloweenAction, HalloweenContainer, HalloweenFields } from "../lib/halloweenContainer.js";
import { HalloweenResponder } from "../lib/halloweenResponder.js";
import { HalloweenViews } from "../lib/halloweenViews.js";
import { HalloweenService } from "../service/halloweenService.js";
import { HalloweenError } from "../types/halloween.js";

export class HalloweenModalHandler extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
    });
  }

  public override parse(interaction: ModalSubmitInteraction) {
    const parsed = HalloweenContainer.parse("hween", HalloweenAction, interaction.customId);

    return parsed?.action === HalloweenAction.ExchangeModal ? this.some(parsed.args[0] === "pumpkin" ? "pumpkin" : "candy") : this.none();
  }

  public override async run(interaction: ModalSubmitInteraction, kind: "candy" | "pumpkin") {
    try {
      if (interaction.isFromMessage()) {
        await interaction.deferUpdate();
      } else {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }

      const subject = await PermissionService.resolveSubject(interaction);

      if (!subject.guildId) {
        throw new HalloweenError("Вы не состоите на сервере бота.");
      }

      const result = await HalloweenService.exchange(
        interaction.user.id,
        subject.guildId,
        kind,
        interaction.fields.getTextInputValue(HalloweenFields.Amount),
      );

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          await HalloweenViews.player(
            interaction.user.id,
            subject.guildId,
            `Обменяно на **${result.coins}** комс-коинов. Баланс: ${result.balance}.`,
          ),
        ],
      });
    } catch (error) {
      await HalloweenResponder.error(interaction, error);
    }
  }
}
