import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { MessageFlags, type StringSelectMenuInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { GiveawayAdminViews } from "../lib/giveawayAdminViews.js";
import { GiveawayAdminAction, GiveawayCustomIds } from "../lib/giveawayCustomIds.js";
import { GiveawayRepository } from "../repositories/giveawayRepository.js";
import { GiveawayService } from "../service/giveawayService.js";

const SELECT_ACTIONS = new Set<GiveawayAdminAction>([
  GiveawayAdminAction.View,
  GiveawayAdminAction.ChannelSet,
  GiveawayAdminAction.RoleSet,
]);

export class GiveawayAdminSelectHandler extends InteractionHandler {
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
    const parsed = GiveawayCustomIds.parseAdmin(interaction.customId);

    if (!parsed || !SELECT_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some(parsed.action);
  }

  public override async run(interaction: StringSelectMenuInteraction, action: GiveawayAdminAction) {
    try {
      await interaction.deferUpdate();

      const guildId = await GiveawayService.assertCanManage(interaction);
      const [value] = interaction.values;

      if (action === GiveawayAdminAction.ChannelSet) {
        await GiveawayRepository.updateSettings(guildId, { channelId: value });
      }

      if (action === GiveawayAdminAction.RoleSet) {
        await GiveawayRepository.updateSettings(guildId, { pingRoleId: value });
      }

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          action === GiveawayAdminAction.View
            ? await GiveawayAdminViews.view(guildId, value)
            : await GiveawayAdminViews.settings(interaction.client, guildId),
        ],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
