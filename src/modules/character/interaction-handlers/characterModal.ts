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
import { CharacterService } from "../service/characterService.js";
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
        parsed.action !== CharacterPanelAction.CreateModal)
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
      await CharacterService.assertCanManage(interaction);

      const container =
        result.action === CharacterPanelAction.Search
          ? await this.search(interaction, result.args[0] as ManageCharacterAction)
          : await this.create(interaction, result.args[0]);

      if (interaction.isFromMessage()) {
        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [container],
        });

        return;
      }

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [container],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
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
