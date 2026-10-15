import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags } from "discord.js";

import { ManageComponents } from "../../manage/lib/manageComponents.js";
import { ManageResponder } from "../../manage/lib/manageResponder.js";
import {
  CharacterCustomIds,
  CharacterPanelAction,
} from "../lib/characterCustomIds.js";
import {
  ACTION_TITLES,
  ManageCharacterContainer,
} from "../lib/manageCharacterContainer.js";
import { getCharacterCategory } from "../lib/manageCharacterComponents.js";
import { CharacterService } from "../service/characterService.js";
import { ManageCharacterAction } from "../types/character.js";

const BUTTON_ACTIONS = new Set<CharacterPanelAction>([
  CharacterPanelAction.Root,
  CharacterPanelAction.Start,
  CharacterPanelAction.Confirm,
  CharacterPanelAction.Category,
]);

export class CharacterButtonHandler extends InteractionHandler {
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
    const parsed = CharacterCustomIds.parse(interaction.customId);

    if (!parsed || !BUTTON_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ButtonInteraction,
    result: {
      action: CharacterPanelAction;
      args: string[];
    },
  ) {
    try {
      if (result.action === CharacterPanelAction.Start) {
        const action = result.args[0] as ManageCharacterAction;

        await interaction.showModal(
          ManageComponents.memberSearchModal(
            CharacterCustomIds.build(CharacterPanelAction.Search, action),
            ACTION_TITLES[action] ?? "Поиск игрока",
          ),
        );

        return;
      }

      await CharacterService.assertCanManage(interaction);

      if (result.action === CharacterPanelAction.Category) {
        const category = getCharacterCategory(result.args[0]);

        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [
            category
              ? ManageCharacterContainer.category(category)
              : ManageCharacterContainer.root(),
          ],
        });

        return;
      }

      if (result.action === CharacterPanelAction.Confirm) {
        const [action, discordId, characterId] = result.args;

        const character = await CharacterService.apply(
          action as ManageCharacterAction,
          discordId,
          characterId,
        );

        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [
            ManageCharacterContainer.done(
              action as ManageCharacterAction,
              character.rpName,
            ),
          ],
        });

        return;
      }

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [ManageCharacterContainer.root()],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
