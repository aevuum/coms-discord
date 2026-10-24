import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, StringSelectMenuInteraction, type ContainerBuilder } from "discord.js";

import { ArtifactAction, ArtifactCustomIds } from "../lib/artifactCustomIds.js";
import { ArtifactView } from "../lib/artifactView.js";
import { RuneResponder } from "../lib/runeResponder.js";

const SELECT_ACTIONS = new Set<ArtifactAction>([
  ArtifactAction.Pick,
  ArtifactAction.Artifact,
  ArtifactAction.Recipe,
  ArtifactAction.Extras,
]);

export class ArtifactSelectHandler extends InteractionHandler {
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
    const parsed = ArtifactCustomIds.parse(interaction.customId);

    if (!parsed || !SELECT_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some({ ...parsed, values: interaction.values });
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    result: { action: ArtifactAction; args: string[]; values: string[] },
  ) {
    try {
      await interaction.deferUpdate();

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [await this.resolve(interaction.user.id, result)],
      });
    } catch (error) {
      await RuneResponder.error(interaction, error);
    }
  }

  private resolve(userId: string, result: { action: ArtifactAction; args: string[]; values: string[] }): Promise<ContainerBuilder> {
    const [characterId] = result.args;
    const [value] = result.values;

    switch (result.action) {
      case ArtifactAction.Pick:
        return ArtifactView.character(userId, value);
      case ArtifactAction.Artifact:
        return ArtifactView.artifact(userId, characterId, value);
      case ArtifactAction.Recipe:
        return ArtifactView.craft(userId, characterId, value, []);
      default:
        return ArtifactView.craft(userId, characterId, result.args[1], result.values);
    }
  }
}
