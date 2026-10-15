import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, StringSelectMenuInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { MemberSearchService } from "../../manage/service/memberSearchService.js";
import {
  CharacterCustomIds,
  CharacterPanelAction,
} from "../lib/characterCustomIds.js";
import { ManageCharacterComponents } from "../lib/manageCharacterComponents.js";
import { ManageCharacterContainer } from "../lib/manageCharacterContainer.js";
import { CharacterInventoryService } from "../service/characterInventoryService.js";
import { CharacterService } from "../service/characterService.js";
import { CharacterError, ManageCharacterAction } from "../types/character.js";

const CONFIRMED_ACTIONS = new Set<ManageCharacterAction>([
  ManageCharacterAction.Delete,
  ManageCharacterAction.Kill,
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

    if (
      !parsed ||
      (parsed.action !== CharacterPanelAction.Member &&
        parsed.action !== CharacterPanelAction.Pick &&
        parsed.action !== CharacterPanelAction.TakeSelect)
    ) {
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
    const action = result.args[0] as ManageCharacterAction;

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

      if (
        result.action === CharacterPanelAction.Member &&
        action === ManageCharacterAction.Create
      ) {
        const member = await MemberSearchService.getMember(result.value);

        await interaction.showModal(
          ManageCharacterComponents.createModal(
            result.value,
            member?.displayName ?? result.value,
          ),
        );

        return;
      }

      await CharacterService.assertCanManage(interaction);

      if (result.action === CharacterPanelAction.Member) {
        const member = await MemberSearchService.getMember(result.value);

        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [
            ManageCharacterContainer.characterSelection(
              action,
              member?.displayName ?? result.value,
              result.value,
              await CharacterService.getCharacters(result.value),
            ),
          ],
        });

        return;
      }

      const discordId = result.args[1];

      if (action === ManageCharacterAction.GiveItem) {
        const character = await CharacterInventoryService.getOwnedCharacter(
          discordId,
          result.value,
        );

        await interaction.showModal(
          ManageCharacterComponents.giveItemModal(
            discordId,
            character.id,
            character.rpName,
          ),
        );

        return;
      }

      if (action === ManageCharacterAction.TakeItem) {
        const character = await CharacterInventoryService.getOwnedCharacter(
          discordId,
          result.value,
        );

        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [
            ManageCharacterContainer.takeSelection(
              discordId,
              character,
              await CharacterInventoryService.list(character.id),
            ),
          ],
        });

        return;
      }

      if (CONFIRMED_ACTIONS.has(action)) {
        const character = await CharacterService.getCharacterById(result.value);

        if (!character || character.user.discordId !== discordId) {
          throw new CharacterError("Персонаж не найден.");
        }

        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [
            ManageCharacterContainer.confirm(action, discordId, character),
          ],
        });

        return;
      }

      const character = await CharacterService.apply(
        action,
        discordId,
        result.value,
      );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [ManageCharacterContainer.done(action, character.rpName)],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
