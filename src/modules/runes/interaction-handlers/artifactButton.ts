import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags, type ContainerBuilder } from "discord.js";

import { ArtifactAction, ArtifactCustomIds } from "../lib/artifactCustomIds.js";
import { ArtifactView } from "../lib/artifactView.js";
import { RuneResponder } from "../lib/runeResponder.js";

const BUTTON_ACTIONS = new Set<ArtifactAction>([
  ArtifactAction.Back,
  ArtifactAction.Home,
  ArtifactAction.Craft,
]);

export class ArtifactButtonHandler extends InteractionHandler {
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
    const parsed = ArtifactCustomIds.parse(interaction.customId);

    if (!parsed || !BUTTON_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ButtonInteraction,
    result: {
      action: ArtifactAction;
      args: string[];
    },
  ) {
    try {
      await interaction.deferUpdate();

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [await this.resolve(interaction.user.id, result.action, result.args)],
      });
    } catch (error) {
      await RuneResponder.error(interaction, error);
    }
  }

  private resolve(userId: string, action: ArtifactAction, args: string[]): Promise<ContainerBuilder> {
    const [characterId] = args;

    switch (action) {
      case ArtifactAction.Home:
        return ArtifactView.character(userId, characterId);

      case ArtifactAction.Craft:
        return ArtifactView.confirm(userId, characterId, args[1]);

      default:
        return ArtifactView.start(userId);
    }
  }
}
