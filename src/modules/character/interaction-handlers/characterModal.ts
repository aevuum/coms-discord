import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, ModalSubmitInteraction } from "discord.js";

import type { CharacterFaculty } from "../../../database/generated/prisma/client.js";

import { MEMBER_QUERY_FIELD } from "../../manage/lib/manageCustomIds.js";
import { ManageContainer } from "../../manage/lib/manageContainer.js";
import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { MemberSearchService } from "../../manage/service/memberSearchService.js";
import {
  CharacterCustomIds,
  CharacterModalFields,
  CharacterPanelAction,
} from "../lib/characterCustomIds.js";
import { ManageCharacterView } from "../lib/manageCharacterView.js";
import { CharacterInventoryService } from "../service/characterInventoryService.js";
import { CharacterService } from "../service/characterService.js";
import { FamiliarService } from "../service/familiarService.js";
import { RuneService } from "../../runes/service/runeService.js";
import { CharacterTab } from "../types/character.js";
import { Mana } from "../../spells/lib/mana.js";
import { Currency } from "../../economy/lib/currency.js";

const MODAL_ACTIONS = new Set<CharacterPanelAction>([
  CharacterPanelAction.Search,
  CharacterPanelAction.CreateModal,
  CharacterPanelAction.GiveModal,
  CharacterPanelAction.TakeModal,
  CharacterPanelAction.ManaModal,
  CharacterPanelAction.BalanceModal,
  CharacterPanelAction.EditModal,
  CharacterPanelAction.FamiliarModal,
  CharacterPanelAction.RuneModal,
]);

export class CharacterModalHandler extends InteractionHandler {
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
    const parsed = CharacterCustomIds.parse(interaction.customId);

    if (!parsed || !MODAL_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ModalSubmitInteraction,
    result: {
      action: CharacterPanelAction;
      args: string[];
    },
  ) {
    try {
      if (interaction.isFromMessage()) {
        await interaction.deferUpdate();
      } else {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }

      await CharacterService.assertCanManage(interaction);

      const container = await this.resolve(interaction, result);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }

  private async resolve(
    interaction: ModalSubmitInteraction,
    result: {
      action: CharacterPanelAction;
      args: string[];
    },
  ) {
    const [discordId, characterId] = result.args;
    const field = (id: string) => interaction.fields.getTextInputValue(id);

    switch (result.action) {
      case CharacterPanelAction.Search:
        return this.search(interaction);

      case CharacterPanelAction.GiveModal: {
        const given = await CharacterInventoryService.give(
          discordId,
          characterId,
          field(CharacterModalFields.ItemName),
          field(CharacterModalFields.ItemQuantity),
          interaction.fields.getUploadedFiles(CharacterModalFields.ItemImage)?.first() ?? null,
        );

        return ManageCharacterView.character(
          discordId,
          characterId,
          CharacterTab.Inventory,
          `Выдано **${given.item.name}** × ${given.quantity}. Теперь в инвентаре: ${given.item.quantity} шт.`,
        );
      }

      case CharacterPanelAction.TakeModal: {
        const taken = await CharacterInventoryService.take(
          discordId,
          characterId,
          result.args[2],
          field(CharacterModalFields.ItemQuantity),
        );

        return ManageCharacterView.character(
          discordId,
          characterId,
          CharacterTab.Inventory,
          `Забрано **${taken.item.name}** × ${taken.quantity}. Осталось: ${Math.max(taken.item.quantity, 0)} шт.`,
        );
      }

      case CharacterPanelAction.ManaModal: {
        const character = await CharacterService.setMana(
          discordId,
          characterId,
          field(CharacterModalFields.ManaCurrent),
          field(CharacterModalFields.ManaMax),
        );

        return ManageCharacterView.character(
          discordId,
          characterId,
          CharacterTab.Stats,
          Mana.hasMagic(character.maxMana)
            ? `Мана установлена: ${Mana.format(character.mana, character.maxMana)}`
            : "Мана 0 / 0: персонаж больше не владеет магией.",
        );
      }

      case CharacterPanelAction.BalanceModal: {
        const { character, change } = await CharacterService.setBalance(
          discordId,
          characterId,
          {
            galleons: field(CharacterModalFields.Galleons),
            sickles: field(CharacterModalFields.Sickles),
            knuts: field(CharacterModalFields.Knuts),
            reason: field(CharacterModalFields.Reason),
          },
        );

        return ManageCharacterView.character(
          discordId,
          characterId,
          CharacterTab.Stats,
          change
            ? `Баланс изменён на ${change > 0 ? "+" : "−"}${Currency.inline(Math.abs(change))}, теперь ${Currency.inline(character.balanceKnuts)}.`
            : "Баланс не изменился.",
        );
      }

      case CharacterPanelAction.EditModal: {
        const character = await CharacterService.edit(
          discordId,
          characterId,
          this.characterFields(interaction),
        );

        return ManageCharacterView.character(
          discordId,
          characterId,
          CharacterTab.Profile,
          `Персонаж **${character.rpName}** изменён.`,
        );
      }

      case CharacterPanelAction.RuneModal: {
        await CharacterInventoryService.getOwnedCharacter(discordId, characterId);

        const saved = await RuneService.set(
          characterId,
          result.args[2],
          field(CharacterModalFields.RuneProgress),
        );

        return ManageCharacterView.character(
          discordId,
          characterId,
          CharacterTab.Runes,
          saved.progress === null
            ? `Руна ${saved.rune.emoji} **${saved.rune.name}** убрана у персонажа.`
            : `Руна ${saved.rune.emoji} **${saved.rune.name}**: ${saved.progress} / 100.`,
        );
      }

      case CharacterPanelAction.FamiliarModal: {
        const familiar = await FamiliarService.save(discordId, characterId, {
          name: field(CharacterModalFields.FamiliarName),
          description: field(CharacterModalFields.FamiliarDescription),
          image:
            interaction.fields.getUploadedFiles(CharacterModalFields.FamiliarImage)?.first() ?? null,
        });

        return ManageCharacterView.character(
          discordId,
          characterId,
          CharacterTab.Familiar,
          `Фамильяр **${familiar.name}** сохранён.`,
        );
      }

      default: {
        const character = await CharacterService.create(
          discordId,
          this.characterFields(interaction),
        );

        return ManageCharacterView.character(
          discordId,
          character.id,
          CharacterTab.Profile,
          `Персонаж **${character.rpName}** создан.`,
        );
      }
    }
  }

  private async search(interaction: ModalSubmitInteraction) {
    const query = interaction.fields.getTextInputValue(MEMBER_QUERY_FIELD);

    return ManageContainer.memberResults(
      "Поиск игрока",
      query,
      await MemberSearchService.search(query),
      CharacterCustomIds.build(CharacterPanelAction.Member),
      CharacterCustomIds.build(CharacterPanelAction.Start),
    );
  }

  private characterFields(interaction: ModalSubmitInteraction) {
    const avatar = interaction.fields.getUploadedFiles(CharacterModalFields.Avatar)?.first();

    return {
      name: interaction.fields.getTextInputValue(CharacterModalFields.Name),
      age: interaction.fields.getTextInputValue(CharacterModalFields.Age),
      specialRole: interaction.fields.getTextInputValue(CharacterModalFields.SpecialRole),
      avatar: avatar ?? null,
      faculty: interaction.fields.getStringSelectValues(
        CharacterModalFields.Faculty,
      )[0] as CharacterFaculty,
    };
  }
}
