import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { StringSelectMenuInteraction, MessageFlags } from "discord.js";
import { CharacterService } from "../service/characterService.js";
import { ManageCharacterContainer } from "../lib/manageCharacterContainer.js";

export class ManageCharacterSelectHandler extends InteractionHandler {
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
    const prefix = "manage_character_select_";

    if (!interaction.customId.startsWith(prefix)) {
      return this.none();
    }

    const data = interaction.customId.replace(prefix, "");

    const separatorIndex = data.indexOf("_");

    if (separatorIndex === -1) {
      return this.none();
    }

    const action = data.substring(0, separatorIndex);

    const userId = data.substring(separatorIndex + 1);

    if (!["delete", "freeze", "unfreeze", "kill"].includes(action)) {
      return this.none();
    }

    return this.some({
      action: action as "delete" | "freeze" | "unfreeze" | "kill",
      userId,
    });
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    result: {
      action: "delete" | "freeze" | "unfreeze" | "kill";
      userId: string;
    },
  ) {
    const characterId = interaction.values[0];

    switch (result.action) {
      case "delete":
        await CharacterService.remove(characterId);
        break;

      case "freeze":
        await CharacterService.freeze(characterId);
        break;
      case "unfreeze":
        await CharacterService.unfreeze(characterId);
        break;

      case "kill":
        await CharacterService.kill(characterId);
        break;
    }

    await interaction.reply({
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      components: [
        ManageCharacterContainer.createSuccess(
          "Операция над персонажем выполнена.",
        ),
      ],
    });
  }
}
