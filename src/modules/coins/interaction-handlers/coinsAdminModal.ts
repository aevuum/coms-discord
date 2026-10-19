import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, ModalSubmitInteraction } from "discord.js";

import { MEMBER_QUERY_FIELD } from "../../manage/lib/manageCustomIds.js";
import { ManageContainer } from "../../manage/lib/manageContainer.js";
import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { MemberSearchService } from "../../manage/service/memberSearchService.js";
import { CoinFormatter } from "../lib/coinFormatter.js";
import { CoinsAdminContainer } from "../lib/coinsAdminContainer.js";
import {
  CoinsAdminAction,
  CoinsCustomIds,
  CoinsModalFields,
} from "../lib/coinsCustomIds.js";
import { CoinService } from "../service/coinService.js";
import { StipendService } from "../service/stipendService.js";
import { ActivityService } from "../../activity/service/activityService.js";

const MODAL_ACTIONS = new Set<CoinsAdminAction>([
  CoinsAdminAction.AmountModal,
  CoinsAdminAction.BalanceSearch,
  CoinsAdminAction.AdjustModal,
  CoinsAdminAction.ActivityModal,
]);

export class CoinsAdminModalHandler extends InteractionHandler {
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
    const parsed = CoinsCustomIds.parse(interaction.customId);

    if (!parsed || !MODAL_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ModalSubmitInteraction,
    result: {
      action: CoinsAdminAction;
      args: string[];
    },
  ) {
    try {
      await ManageResponder.defer(interaction);

      const guildId = await CoinService.assertCanManage(interaction);

      const container = await this.resolve(interaction, guildId, result);

      await ManageResponder.send(interaction, container);
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }

  private async resolve(
    interaction: ModalSubmitInteraction,
    guildId: string,
    result: {
      action: CoinsAdminAction;
      args: string[];
    },
  ) {
    if (result.action === CoinsAdminAction.AmountModal) {
      await StipendService.set(
        guildId,
        result.args[0],
        interaction.fields.getTextInputValue(CoinsModalFields.Amount),
      );

      return CoinsAdminContainer.root(await StipendService.list(guildId));
    }

    if (result.action === CoinsAdminAction.ActivityModal) {
      const field = (id: string) => interaction.fields.getTextInputValue(id);

      return CoinsAdminContainer.activity(
        await ActivityService.setRewards([
          field(CoinsModalFields.First),
          field(CoinsModalFields.Second),
          field(CoinsModalFields.Third),
        ]),
      );
    }

    if (result.action === CoinsAdminAction.BalanceSearch) {
      const query = interaction.fields.getTextInputValue(MEMBER_QUERY_FIELD);

      return ManageContainer.memberResults(
        "Баланс игрока",
        query,
        await MemberSearchService.search(query),
        CoinsCustomIds.build(CoinsAdminAction.BalanceMember),
        CoinsCustomIds.build(CoinsAdminAction.Balance),
      );
    }

    const [mode, discordId] = result.args;

    const remove = mode === "remove";

    const adjusted = await CoinService.adminAdjust(
      discordId,
      interaction.fields.getTextInputValue(CoinsModalFields.Amount),
      interaction.fields.getTextInputValue(CoinsModalFields.Reason),
      remove,
    );

    const member = await MemberSearchService.getMember(discordId);

    return CoinsAdminContainer.player(
      member?.displayName ?? discordId,
      discordId,
      adjusted.balance,
      await CoinService.getHistory(discordId),
      `${remove ? "Списано" : "Начислено"} ${CoinFormatter.amount(adjusted.amount)}`,
    );
  }
}
