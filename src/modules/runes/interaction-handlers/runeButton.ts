import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags, type ContainerBuilder } from "discord.js";

import { RuneContainer } from "../lib/runeContainer.js";
import { RuneAction, RuneCustomIds, RuneTab } from "../lib/runeCustomIds.js";
import { RuneResponder } from "../lib/runeResponder.js";
import { RuneView } from "../lib/runeView.js";
import { RuneRegistry } from "../service/runeRegistry.js";
import { RuneService } from "../service/runeService.js";

const BUTTON_ACTIONS = new Set<RuneAction>([
  RuneAction.Back,
  RuneAction.Page,
  RuneAction.Study,
]);

export class RuneButtonHandler extends InteractionHandler {
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
    const parsed = RuneCustomIds.parse(interaction.customId);

    if (!parsed || !BUTTON_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ButtonInteraction,
    result: {
      action: RuneAction;
      args: string[];
    },
  ) {
    const userId = interaction.user.id;
    const [characterId] = result.args;

    try {
      if (result.action === RuneAction.Study) {
        await RuneService.getOwnedCharacter(userId, characterId);
        await interaction.showModal(RuneContainer.studyModal(characterId, await RuneRegistry.get(result.args[1])));
        return;
      }

      await interaction.deferUpdate();

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [await this.resolve(userId, result.action, result.args)],
      });
    } catch (error) {
      await RuneResponder.error(interaction, error);
    }
  }

  private resolve(userId: string, action: RuneAction, args: string[]): Promise<ContainerBuilder> {
    const [characterId] = args;

    switch (action) {
      case RuneAction.Page:
        return RuneView.character(userId, characterId, args[1] as RuneTab, Number(args[2]) || 0);

      default:
        return RuneView.start(userId);
    }
  }
}
