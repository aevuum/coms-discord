import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, StringSelectMenuInteraction, type ContainerBuilder } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { RuneAdminContainer } from "../lib/runeAdminContainer.js";
import { RuneAdminAction, RuneAdminCustomIds, RuneAdminSection } from "../lib/runeAdminCustomIds.js";
import { RuneAdminViews } from "../lib/runeAdminViews.js";
import { ArtifactService } from "../service/artifactService.js";
import { RuneAudit } from "../service/runeAudit.js";

const SELECT_ACTIONS = new Set<RuneAdminAction>([
  RuneAdminAction.Section,
  RuneAdminAction.Request,
  RuneAdminAction.Attempt,
  RuneAdminAction.Formula,
  RuneAdminAction.Recipe,
  RuneAdminAction.Rune,
  RuneAdminAction.Material,
  RuneAdminAction.Blank,
]);

export class RuneAdminSelectHandler extends InteractionHandler {
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
    const parsed = RuneAdminCustomIds.parse(interaction.customId);

    if (!parsed || !SELECT_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some({ action: parsed.action, value: interaction.values[0] });
  }

  public override async run(interaction: StringSelectMenuInteraction, result: { action: RuneAdminAction; value: string }) {
    try {
      await RuneAudit.assertCurator(interaction);

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [await this.view(result.action, result.value)],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }

  private async view(action: RuneAdminAction, value: string): Promise<ContainerBuilder> {
    switch (action) {
      case RuneAdminAction.Section:
        return RuneAdminViews.section(value as RuneAdminSection);
      case RuneAdminAction.Request:
        return RuneAdminViews.request(value);
      case RuneAdminAction.Attempt:
        return RuneAdminViews.attempt(value);
      case RuneAdminAction.Formula:
        return RuneAdminViews.formula(value);
      case RuneAdminAction.Recipe:
        return RuneAdminViews.recipe(value);
      case RuneAdminAction.Rune:
        return RuneAdminViews.rune(value);
      case RuneAdminAction.Material:
        return RuneAdminContainer.material(await ArtifactService.getMaterial(value));
      default:
        return RuneAdminContainer.blank(await ArtifactService.getBlank(value));
    }
  }
}
