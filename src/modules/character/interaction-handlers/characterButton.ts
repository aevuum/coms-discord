import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags, type ContainerBuilder } from "discord.js";

import { ManageComponents } from "../../manage/lib/manageComponents.js";
import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { MemberSearchService } from "../../manage/service/memberSearchService.js";
import {
  CharacterCustomIds,
  CharacterPanelAction,
} from "../lib/characterCustomIds.js";
import { ManageCharacterComponents } from "../lib/manageCharacterComponents.js";
import {
  ACTION_RESULTS,
  ManageCharacterContainer,
} from "../lib/manageCharacterContainer.js";
import { ManageCharacterView } from "../lib/manageCharacterView.js";
import { CharacterInventoryService } from "../service/characterInventoryService.js";
import { CharacterService } from "../service/characterService.js";
import { FamiliarService } from "../service/familiarService.js";
import {
  ACTION_TABS,
  CharacterTab,
  ManageCharacterAction,
} from "../types/character.js";

const BUTTON_ACTIONS = new Set<CharacterPanelAction>([
  CharacterPanelAction.Root,
  CharacterPanelAction.Start,
  CharacterPanelAction.Player,
  CharacterPanelAction.Character,
  CharacterPanelAction.Create,
  CharacterPanelAction.Act,
  CharacterPanelAction.Confirm,
]);

const MODAL_ACTIONS = new Set<ManageCharacterAction>([
  ManageCharacterAction.Edit,
  ManageCharacterAction.SetMana,
  ManageCharacterAction.SetBalance,
  ManageCharacterAction.GiveItem,
]);

const CONFIRMED_ACTIONS = new Set<ManageCharacterAction>([
  ManageCharacterAction.Delete,
  ManageCharacterAction.Kill,
  ManageCharacterAction.FamiliarDelete,
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
        await interaction.showModal(
          ManageComponents.memberSearchModal(
            CharacterCustomIds.build(CharacterPanelAction.Search),
            "Поиск игрока",
          ),
        );

        return;
      }

      if (result.action === CharacterPanelAction.Create) {
        const member = await MemberSearchService.getMember(result.args[0]);

        await interaction.showModal(
          ManageCharacterComponents.createModal(
            result.args[0],
            member?.displayName ?? result.args[0],
          ),
        );

        return;
      }

      if (result.action === CharacterPanelAction.Act) {
        const [action, discordId, characterId] = result.args as [
          ManageCharacterAction,
          string,
          string,
        ];

        if (action === ManageCharacterAction.Familiar) {
          const character = await CharacterInventoryService.getOwnedCharacter(
            discordId,
            characterId,
          );

          await interaction.showModal(
            ManageCharacterComponents.familiarModal(
              discordId,
              character,
              character.familiar ?? null,
            ),
          );

          return;
        }

        if (MODAL_ACTIONS.has(action)) {
          const character = await CharacterInventoryService.getOwnedCharacter(
            discordId,
            characterId,
          );

          await interaction.showModal(
            action === ManageCharacterAction.Edit
              ? ManageCharacterComponents.editModal(discordId, character)
              : action === ManageCharacterAction.SetMana
                ? ManageCharacterComponents.manaModal(discordId, character)
                : action === ManageCharacterAction.SetBalance
                  ? ManageCharacterComponents.balanceModal(discordId, character)
                  : ManageCharacterComponents.giveItemModal(
                      discordId,
                      character.id,
                      character.rpName,
                    ),
          );

          return;
        }
      }

      await CharacterService.assertCanManage(interaction);

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [await this.resolve(result)],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }

  private async resolve(result: {
    action: CharacterPanelAction;
    args: string[];
  }): Promise<ContainerBuilder> {
    switch (result.action) {
      case CharacterPanelAction.Player:
        return ManageCharacterView.player(result.args[0]);

      case CharacterPanelAction.Character:
        return ManageCharacterView.character(
          result.args[0],
          result.args[1],
          (result.args[2] as CharacterTab | undefined) ?? CharacterTab.Profile,
        );

      case CharacterPanelAction.Act: {
        const [action, discordId, characterId] = result.args as [
          ManageCharacterAction,
          string,
          string,
        ];

        const character = await CharacterInventoryService.getOwnedCharacter(
          discordId,
          characterId,
        );

        if (action === ManageCharacterAction.TakeItem) {
          return ManageCharacterContainer.takeSelection(
            discordId,
            character,
            await CharacterInventoryService.list(character.id),
          );
        }

        if (CONFIRMED_ACTIONS.has(action)) {
          return ManageCharacterContainer.confirm(action, discordId, character);
        }

        return this.apply(action, discordId, characterId);
      }

      case CharacterPanelAction.Confirm: {
        const [action, discordId, characterId] = result.args as [
          ManageCharacterAction,
          string,
          string,
        ];

        return this.apply(action, discordId, characterId);
      }

      default:
        return ManageCharacterContainer.root();
    }
  }

  private async apply(
    action: ManageCharacterAction,
    discordId: string,
    characterId: string,
  ) {
    const tab = ACTION_TABS[action] ?? CharacterTab.Profile;

    if (action === ManageCharacterAction.FamiliarDelete) {
      const familiar = await FamiliarService.remove(discordId, characterId);

      return ManageCharacterView.character(
        discordId,
        characterId,
        tab,
        `Фамильяр **${familiar.name}** отвязан и удалён.`,
      );
    }

    const character = await CharacterService.apply(action, discordId, characterId);

    const notice = `Персонаж **${character.rpName}** ${ACTION_RESULTS[action]}.`;

    if (action === ManageCharacterAction.Delete) {
      return ManageCharacterView.player(discordId, notice);
    }

    return ManageCharacterView.character(discordId, characterId, tab, notice);
  }
}
