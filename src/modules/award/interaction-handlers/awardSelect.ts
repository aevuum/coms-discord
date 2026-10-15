import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, StringSelectMenuInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { MemberSearchService } from "../../manage/service/memberSearchService.js";
import { AwardContainer } from "../lib/awardContainer.js";
import { AwardAction, AwardCustomIds } from "../lib/awardCustomIds.js";
import { AwardService } from "../service/awardService.js";
import { AwardError } from "../types/award.js";

const SELECT_ACTIONS = new Set<AwardAction>([
  AwardAction.DeleteSelect,
  AwardAction.GiveMember,
  AwardAction.GiveAward,
  AwardAction.TakeMember,
  AwardAction.TakeAward,
]);

export class AwardSelectHandler extends InteractionHandler {
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
    const parsed = AwardCustomIds.parse(interaction.customId);

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
      action: AwardAction;
      args: string[];
      value: string;
    },
  ) {
    try {
      await AwardService.assertCanManage(interaction);

      const container = await this.resolve(result);

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }

  private async resolve(result: {
    action: AwardAction;
    args: string[];
    value: string;
  }) {
    switch (result.action) {
      case AwardAction.DeleteSelect:
        return AwardContainer.deleteConfirm(
          await AwardService.getAward(result.value),
        );

      case AwardAction.GiveMember: {
        const name = await this.memberName(result.value);

        return AwardContainer.selectToGive(
          name,
          result.value,
          await AwardService.getAwards(),
        );
      }

      case AwardAction.TakeMember: {
        const name = await this.memberName(result.value);

        const awards = await AwardService.getUserAwards(result.value);

        return AwardContainer.selectToTake(
          name,
          result.value,
          awards.map((userAward) => userAward.award),
        );
      }

      case AwardAction.GiveAward: {
        const discordId = result.args[0];

        const award = await AwardService.giveAward(discordId, result.value);

        return AwardContainer.result(
          "Награда выдана",
          `${award.emoji} **${award.label}** выдана игроку **${await this.memberName(discordId)}** (+${award.rewardComsCoins} COMS).`,
        );
      }

      case AwardAction.TakeAward: {
        const discordId = result.args[0];

        const award = await AwardService.removeAward(discordId, result.value);

        return AwardContainer.result(
          "Награда снята",
          `${award.emoji} **${award.label}** снята с игрока **${await this.memberName(discordId)}** (−${award.rewardComsCoins} COMS).`,
        );
      }

      default:
        throw new AwardError("Неизвестное действие.");
    }
  }

  private async memberName(discordId: string) {
    const member = await MemberSearchService.getMember(discordId);

    return member?.displayName ?? discordId;
  }
}
