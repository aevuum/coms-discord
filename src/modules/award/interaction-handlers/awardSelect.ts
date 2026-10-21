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
  AwardAction.PlayerMember,
  AwardAction.GiveAward,
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

      case AwardAction.PlayerMember:
        return this.player(result.value);

      case AwardAction.GiveAward: {
        const discordId = result.args[0];

        const award = await AwardService.giveAward(discordId, result.value);

        return this.player(
          discordId,
          `${award.emoji} **${award.label}** выдана (+${award.rewardComsCoins} COMS).`,
        );
      }

      case AwardAction.TakeAward: {
        const discordId = result.args[0];

        const award = await AwardService.removeAward(discordId, result.value);

        return this.player(
          discordId,
          `${award.emoji} **${award.label}** снята (−${award.deducted} COMS${award.deducted < award.rewardComsCoins ? `, на балансе было меньше ${award.rewardComsCoins}` : ""}).`,
        );
      }

      default:
        throw new AwardError("Неизвестное действие.");
    }
  }

  private async player(discordId: string, notice: string | null = null) {
    const [name, awards, owned] = await Promise.all([
      this.memberName(discordId),
      AwardService.getAwards(),
      AwardService.getUserAwards(discordId),
    ]);

    return AwardContainer.player(
      name,
      discordId,
      awards,
      owned.map((userAward) => userAward.award),
      notice,
    );
  }

  private async memberName(discordId: string) {
    const member = await MemberSearchService.getMember(discordId);

    return member?.displayName ?? discordId;
  }
}
