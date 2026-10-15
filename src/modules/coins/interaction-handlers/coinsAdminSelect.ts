import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, StringSelectMenuInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { MemberSearchService } from "../../manage/service/memberSearchService.js";
import { CoinsAdminContainer } from "../lib/coinsAdminContainer.js";
import { CoinsAdminAction, CoinsCustomIds } from "../lib/coinsCustomIds.js";
import { CoinService } from "../service/coinService.js";
import { StipendService } from "../service/stipendService.js";

const SELECT_ACTIONS = new Set<CoinsAdminAction>([
  CoinsAdminAction.Role,
  CoinsAdminAction.Stipend,
  CoinsAdminAction.BalanceMember,
]);

export class CoinsAdminSelectHandler extends InteractionHandler {
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
    const parsed = CoinsCustomIds.parse(interaction.customId);

    if (!parsed || !SELECT_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some({
      action: parsed.action,
      value: interaction.values[0],
    });
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    result: {
      action: CoinsAdminAction;
      value: string;
    },
  ) {
    try {
      if (result.action === CoinsAdminAction.Role) {
        await interaction.showModal(CoinsAdminContainer.amountModal(result.value));
        return;
      }

      const guildId = await CoinService.assertCanManage(interaction);

      if (result.action === CoinsAdminAction.Stipend) {
        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [
            CoinsAdminContainer.stipend(
              await StipendService.get(guildId, result.value),
            ),
          ],
        });

        return;
      }

      const member = await MemberSearchService.getMember(result.value);

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [
          CoinsAdminContainer.player(
            member?.displayName ?? result.value,
            result.value,
            await CoinService.getBalance(result.value),
            await CoinService.getHistory(result.value),
          ),
        ],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
