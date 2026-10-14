import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, ModalSubmitInteraction } from "discord.js";

import { TupperService } from "../service/tupperService.js";
import { TupperComponents } from "../lib/tupperComponents.js";
import {
  TupperAction,
  TupperCustomIds,
  TupperModalFields,
} from "../lib/tupperCustomIds.js";
import { TupperResponder } from "../lib/tupperResponder.js";

const MODAL_ACTIONS = new Set<TupperAction>([
  TupperAction.NameModal,
  TupperAction.PrefixModal,
]);

export class TupperModal extends InteractionHandler {
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
    const parsed = TupperCustomIds.parse(interaction.customId);

    if (!parsed || !MODAL_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ModalSubmitInteraction,
    result: {
      action: TupperAction;
      args: string[];
    },
  ) {
    const [characterId] = result.args;

    try {
      const character =
        result.action === TupperAction.NameModal
          ? await TupperService.rename(
              interaction.user.id,
              characterId,
              interaction.fields.getTextInputValue(TupperModalFields.Name),
            )
          : await TupperService.changePrefix(
              interaction.user.id,
              characterId,
              interaction.fields.getTextInputValue(TupperModalFields.Prefix),
            );

      const components = [TupperComponents.settings(character, true)];

      if (interaction.isFromMessage()) {
        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components,
        });

        return;
      }

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components,
      });
    } catch (error) {
      await TupperResponder.error(interaction, error);
    }
  }
}
