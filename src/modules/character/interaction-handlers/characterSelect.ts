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
import { getRune } from "../../runes/lib/runeCatalog.js";
import { RuneService } from "../../runes/service/runeService.js";
import { CharacterFormatter } from "../../economy/lib/characterFormatter.js";
import { CharacterError, CharacterTab } from "../types/character.js";

const SELECT_ACTIONS = new Set<CharacterPanelAction>([
  CharacterPanelAction.Member,
  CharacterPanelAction.Pick,
  CharacterPanelAction.TakeSelect,
  CharacterPanelAction.Tab,
  CharacterPanelAction.RuneSelect,
  CharacterPanelAction.TraitSelect,
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

      if (result.action === CharacterPanelAction.RuneSelect) {
        const [discordId, characterId] = result.args;
        const rune = getRune(result.value);

        if (!rune) {
          throw new CharacterError("Руна не найдена.");
        }

        const character = await CharacterInventoryService.getOwnedCharacter(discordId, characterId);
        const learned = await RuneService.learned(character.id);

        await interaction.showModal(
          ManageCharacterComponents.runeModal(
            discordId,
            character,
            rune,
            learned.find((entry) => entry.rune.key === rune.key)?.progress ?? null,
          ),
        );

        return;
      }

      await CharacterService.assertCanManage(interaction);

      if (result.action === CharacterPanelAction.TraitSelect) {
        const [discordId, characterId] = result.args;
        const { trait } = await CharacterService.setTrait(discordId, characterId, result.value);

        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [
            await ManageCharacterView.character(
              discordId,
              characterId,
              CharacterTab.Profile,
              `Магический дар: ${CharacterFormatter.trait(trait)}.`,
            ),
          ],
        });

        return;
      }

      const container =
        result.action === CharacterPanelAction.Member
          ? await ManageCharacterView.player(result.value)
          : result.action === CharacterPanelAction.Tab
            ? await ManageCharacterView.character(
                result.args[0],
                result.args[1],
                result.value as CharacterTab,
              )
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
