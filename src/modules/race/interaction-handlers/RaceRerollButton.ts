import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { MessageFlags, type ButtonInteraction } from "discord.js";
import { RaceService } from "../service/raceService.js";
import { PermissionService } from "../../permissions/service/permissionService.js";
import { PermissionContainer } from "../../permissions/lib/permissionContainer.js";

export class RaceRerollButton extends InteractionHandler {
  public constructor(
    context: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(context, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button,
    });
  }

  public override parse(interaction: ButtonInteraction) {
    if (interaction.customId === "race:reroll") {
      return this.some();
    }
    return this.none();
  }

  public override async run(interaction: ButtonInteraction) {
    if (!(await PermissionService.canUse(interaction, "race"))) {
      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [
          PermissionContainer.error(
            "У вас нет прав для использования кнопки перекрута.",
          ),
        ],
      });
      return;
    }

    const race = RaceService.rollRace();
    const embed = RaceService.createEmbed(race);
    const row = RaceService.createButtonRow();

    await interaction.update({
      embeds: [embed],
      components: [row],
    });
  }
}
