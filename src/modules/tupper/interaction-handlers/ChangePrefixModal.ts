import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, ModalSubmitInteraction } from "discord.js";

import { TupperService } from "../service/tupperService.js";
import { CharacterService } from "../../character/service/characterService.js";
import { TupperComponents } from "../lib/tupperComponents.js";

export class ChangePrefixModal extends InteractionHandler {
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
    if (!interaction.customId.startsWith("tupper_prefix_modal_")) {
      return this.none();
    }

    const characterId = interaction.customId.replace(
      "tupper_prefix_modal_",
      "",
    );

    return this.some({
      characterId,
    });
  }

  public override async run(
    interaction: ModalSubmitInteraction,
    result: {
      characterId: string;
    },
  ) {
    const prefix = interaction.fields.getTextInputValue("prefix");

    try {
      await TupperService.changePrefix(result.characterId, prefix);
    } catch (error) {
      return interaction.reply({
        content: error instanceof Error ? error.message : "Произошла ошибка.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const character = await CharacterService.getCharacterById(
      result.characterId,
    );

    if (!character) {
      return interaction.reply({
        content: "Персонаж не найден.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,

      components: TupperComponents.createSettings(character),
    });
  }
}
