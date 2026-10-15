import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, StringSelectMenuInteraction } from "discord.js";

import { ManageAction, ManageCustomIds } from "../lib/manageCustomIds.js";
import { ManageResponder } from "../lib/manageResponder.js";
import { ManageService } from "../service/manageService.js";

export class ManageSectionSelectHandler extends InteractionHandler {
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
    const parsed = ManageCustomIds.parse(interaction.customId);

    if (!parsed || parsed.action !== ManageAction.Section) {
      return this.none();
    }

    return this.some({
      sectionId: interaction.values[0],
    });
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    result: {
      sectionId: string;
    },
  ) {
    try {
      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [
          await ManageService.openSection(interaction, result.sectionId),
        ],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
