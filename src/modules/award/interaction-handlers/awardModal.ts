import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, ModalSubmitInteraction } from "discord.js";

import { MEMBER_QUERY_FIELD } from "../../manage/lib/manageCustomIds.js";
import { ManageContainer } from "../../manage/lib/manageContainer.js";
import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { MemberSearchService } from "../../manage/service/memberSearchService.js";
import { AwardContainer } from "../lib/awardContainer.js";
import {
  AwardAction,
  AwardCustomIds,
  AwardModalFields,
} from "../lib/awardCustomIds.js";
import { AwardService } from "../service/awardService.js";

const MODAL_ACTIONS = new Set<AwardAction>([
  AwardAction.CreateModal,
  AwardAction.PlayerSearch,
]);

export class AwardModalHandler extends InteractionHandler {
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
    const parsed = AwardCustomIds.parse(interaction.customId);

    if (!parsed || !MODAL_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ModalSubmitInteraction,
    result: {
      action: AwardAction;
      args: string[];
    },
  ) {
    try {
      await ManageResponder.defer(interaction);

      await AwardService.assertCanManage(interaction);

      const container = await this.resolve(interaction, result.action);

      await ManageResponder.send(interaction, container);
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }

  private async resolve(
    interaction: ModalSubmitInteraction,
    action: AwardAction,
  ) {
    if (action === AwardAction.CreateModal) {
      const award = await AwardService.createAward({
        label: interaction.fields.getTextInputValue(AwardModalFields.Label),
        emoji: interaction.fields.getTextInputValue(AwardModalFields.Emoji),
        coins: interaction.fields.getTextInputValue(AwardModalFields.Coins),
        description: interaction.fields.getTextInputValue(
          AwardModalFields.Description,
        ),
        rarity:
          interaction.fields.getStringSelectValues(AwardModalFields.Rarity)[0] ??
          "",
      });

      return AwardContainer.result(
        "Награда создана",
        `${award.emoji} **${award.label}** добавлена в список наград.`,
      );
    }

    const query = interaction.fields.getTextInputValue(MEMBER_QUERY_FIELD);

    return ManageContainer.memberResults(
      "Награды игрока",
      query,
      await MemberSearchService.search(query),
      AwardCustomIds.build(AwardAction.PlayerMember),
      AwardCustomIds.build(AwardAction.Player),
    );
  }
}
