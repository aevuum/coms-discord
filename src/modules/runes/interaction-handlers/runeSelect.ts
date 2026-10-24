import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, StringSelectMenuInteraction, type ContainerBuilder } from "discord.js";

import { RuneAction, RuneCustomIds, RuneTab } from "../lib/runeCustomIds.js";
import { RuneResponder } from "../lib/runeResponder.js";
import { RuneView } from "../lib/runeView.js";

const SELECT_ACTIONS = new Set<RuneAction>([
  RuneAction.Pick,
  RuneAction.Tab,
  RuneAction.Info,
  RuneAction.Formula,
  RuneAction.Artifact,
  RuneAction.Recipe,
  RuneAction.Extras,
]);

export class RuneSelectHandler extends InteractionHandler {
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
    const parsed = RuneCustomIds.parse(interaction.customId);

    if (!parsed || !SELECT_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some({ ...parsed, values: interaction.values });
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    result: { action: RuneAction; args: string[]; values: string[] },
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

  private resolve(userId: string, result: { action: RuneAction; args: string[]; values: string[] }): Promise<ContainerBuilder> {
    const [characterId] = result.args;
    const [value] = result.values;

    switch (result.action) {
      case RuneAction.Pick:
        return RuneView.character(userId, value);
      case RuneAction.Tab:
        return RuneView.character(userId, characterId, value as RuneTab);
      case RuneAction.Info:
        return RuneView.runeInfo(userId, characterId, value);
      case RuneAction.Formula:
        return RuneView.formula(userId, characterId, value);
      case RuneAction.Artifact:
        return RuneView.artifact(userId, characterId, value);
      case RuneAction.Recipe:
        return RuneView.craft(userId, characterId, value, []);
      default:
        return RuneView.craft(userId, characterId, result.args[1], result.values);
    }
  }
}
