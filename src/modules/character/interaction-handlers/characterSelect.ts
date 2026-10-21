import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, StringSelectMenuInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import {
  CharacterCustomIds,
  CharacterPanelAction,
} from "../lib/characterCustomIds.js";
import { ManageCharacterComponents } from "../lib/manageCharacterComponents.js";
import { ManageCharacterView } from "../lib/manageCharacterView.js";
import { CharacterInventoryService } from "../service/characterInventoryService.js";
import { CharacterService } from "../service/characterService.js";

const SELECT_ACTIONS = new Set<CharacterPanelAction>([
  CharacterPanelAction.Member,
  CharacterPanelAction.Pick,
  CharacterPanelAction.TakeSelect,
]);

export class CharacterSelectHandler extends InteractionHandler {
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
    const parsed = CharacterCustomIds.parse(interaction.customId);

    if (!parsed || !SELECT_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some({
      ...parsed,
      value: interaction.values[0],
    });
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    result: {
      action: CharacterPanelAction;
      args: string[];
      value: string;
    },
  ) {
    try {
      if (result.action === CharacterPanelAction.TakeSelect) {
        const [discordId, characterId] = result.args;

        const item = await CharacterInventoryService.getItem(
          characterId,
          result.value,
        );

        await interaction.showModal(
          ManageCharacterComponents.takeItemModal(discordId, characterId, item),
        );

        return;
      }

      await CharacterService.assertCanManage(interaction);

      const container =
        result.action === CharacterPanelAction.Member
          ? await ManageCharacterView.player(result.value)
          : await ManageCharacterView.character(result.args[0], result.value);

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
