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
import {
  ACTION_TITLES,
  ManageCharacterContainer,
} from "../lib/manageCharacterContainer.js";
import { CharacterInventoryService } from "../service/characterInventoryService.js";
import { CharacterService } from "../service/characterService.js";
import { Mana } from "../../spells/lib/mana.js";
import { ManageCharacterAction } from "../types/character.js";

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

    if (
      !parsed ||
      (parsed.action !== CharacterPanelAction.Search &&
        parsed.action !== CharacterPanelAction.CreateModal &&
        parsed.action !== CharacterPanelAction.GiveModal &&
        parsed.action !== CharacterPanelAction.TakeModal &&
        parsed.action !== CharacterPanelAction.ManaModal)
    ) {
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
    switch (result.action) {
      case CharacterPanelAction.Search:
        return this.search(interaction, result.args[0] as ManageCharacterAction);

      case CharacterPanelAction.GiveModal:
        return this.giveItem(interaction, result.args[0], result.args[1]);

      case CharacterPanelAction.TakeModal:
        return this.takeItem(
          interaction,
          result.args[0],
          result.args[1],
          result.args[2],
        );

      case CharacterPanelAction.ManaModal: {
        const character = await CharacterService.setMana(
          result.args[0],
          result.args[1],
          interaction.fields.getTextInputValue(CharacterModalFields.ManaCurrent),
          interaction.fields.getTextInputValue(CharacterModalFields.ManaMax),
        );

        return ManageCharacterContainer.result(
          ACTION_TITLES[ManageCharacterAction.SetMana],
          `Мана персонажа **${character.rpName}**: ${Mana.format(character.mana, character.maxMana)}`,
        );
      }

      default:
        return this.create(interaction, result.args[0]);
    }
  }

  private async search(
    interaction: ModalSubmitInteraction,
    action: ManageCharacterAction,
  ) {
    const query = interaction.fields.getTextInputValue(MEMBER_QUERY_FIELD);

    return ManageContainer.memberResults(
      ACTION_TITLES[action] ?? "Поиск игрока",
      query,
      await MemberSearchService.search(query),
      CharacterCustomIds.build(CharacterPanelAction.Member, action),
      CharacterCustomIds.build(CharacterPanelAction.Start, action),
    );
  }

  private async giveItem(
    interaction: ModalSubmitInteraction,
    discordId: string,
    characterId: string,
  ) {
    const files = interaction.fields.getUploadedFiles(CharacterModalFields.ItemImage);

    const given = await CharacterInventoryService.give(
      discordId,
      characterId,
      interaction.fields.getTextInputValue(CharacterModalFields.ItemName),
      interaction.fields.getTextInputValue(CharacterModalFields.ItemQuantity),
      files?.first() ?? null,
    );

    return ManageCharacterContainer.result(
      ACTION_TITLES[ManageCharacterAction.GiveItem],
      `Персонаж **${given.character.rpName}** получил **${given.item.name}** × ${given.quantity}. Теперь в инвентаре: ${given.item.quantity} шт.`,
    );
  }

  private async takeItem(
    interaction: ModalSubmitInteraction,
    discordId: string,
    characterId: string,
    itemId: string,
  ) {
    const taken = await CharacterInventoryService.take(
      discordId,
      characterId,
      itemId,
      interaction.fields.getTextInputValue(CharacterModalFields.ItemQuantity),
    );

    return ManageCharacterContainer.result(
      ACTION_TITLES[ManageCharacterAction.TakeItem],
      `У персонажа **${taken.character.rpName}** забрано **${taken.item.name}** × ${taken.quantity}. Осталось: ${Math.max(taken.item.quantity, 0)} шт.`,
    );
  }

  private async create(interaction: ModalSubmitInteraction, discordId: string) {
    const files = interaction.fields.getUploadedFiles(CharacterModalFields.Avatar);

    const avatar = files?.first();

    const character = await CharacterService.create(
      discordId,
      interaction.fields.getTextInputValue(CharacterModalFields.Name),
      avatar?.contentType?.startsWith("image/") ? avatar.url : null,
      interaction.fields.getStringSelectValues(
        CharacterModalFields.Faculty,
      )[0] as CharacterFaculty,
    );

    const member = await MemberSearchService.getMember(discordId);

    return ManageCharacterContainer.result(
      ACTION_TITLES[ManageCharacterAction.Create],
      `Персонаж **${character.rpName}** создан для игрока **${member?.displayName ?? discordId}**.`,
    );
  }
}
