import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { MessageFlags, type ButtonInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { GiveawayAdminContainer } from "../lib/giveawayAdminContainer.js";
import { GiveawayAdminViews } from "../lib/giveawayAdminViews.js";
import { GiveawayAdminAction, GiveawayCustomIds } from "../lib/giveawayCustomIds.js";
import { GiveawayRepository } from "../repositories/giveawayRepository.js";
import { GiveawayService } from "../service/giveawayService.js";

const BUTTON_ACTIONS = new Set<GiveawayAdminAction>([
  GiveawayAdminAction.Root,
  GiveawayAdminAction.Create,
  GiveawayAdminAction.View,
  GiveawayAdminAction.End,
  GiveawayAdminAction.Cancel,
  GiveawayAdminAction.CancelConfirm,
  GiveawayAdminAction.Reroll,
  GiveawayAdminAction.Settings,
  GiveawayAdminAction.ChannelPage,
  GiveawayAdminAction.RolePage,
  GiveawayAdminAction.RoleClear,
]);

type AdminButton = {
  action: GiveawayAdminAction;
  args: string[];
};

export class GiveawayAdminButtonHandler extends InteractionHandler {
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
    const parsed = GiveawayCustomIds.parseAdmin(interaction.customId);

    if (!parsed || !BUTTON_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some<AdminButton>(parsed);
  }

  public override async run(interaction: ButtonInteraction, result: AdminButton) {
    try {
      if (result.action === GiveawayAdminAction.Create) {
        await GiveawayService.assertCanManage(interaction);

        await interaction.showModal(GiveawayAdminContainer.createModal());
        return;
      }

      await interaction.deferUpdate();

      const guildId = await GiveawayService.assertCanManage(interaction);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [await this.resolve(interaction, guildId, result)],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }

  private async resolve(interaction: ButtonInteraction, guildId: string, result: AdminButton) {
    const { client } = interaction;
    const [arg] = result.args;

    switch (result.action) {
      case GiveawayAdminAction.View:
        return GiveawayAdminViews.view(guildId, arg);

      case GiveawayAdminAction.End:
        await GiveawayService.endNow(client, guildId, arg);
        return GiveawayAdminViews.view(guildId, arg);

      case GiveawayAdminAction.Cancel:
        return GiveawayAdminContainer.cancelConfirm(await GiveawayService.get(guildId, arg));

      case GiveawayAdminAction.CancelConfirm:
        await GiveawayService.cancel(client, guildId, arg);
        return GiveawayAdminViews.view(guildId, arg);

      case GiveawayAdminAction.Reroll:
        await GiveawayService.reroll(client, guildId, arg);
        return GiveawayAdminViews.view(guildId, arg);

      case GiveawayAdminAction.Settings:
        return GiveawayAdminViews.settings(client, guildId);

      case GiveawayAdminAction.ChannelPage:
        return GiveawayAdminViews.channelPicker(client, guildId, Number(arg) || 0);

      case GiveawayAdminAction.RolePage:
        return GiveawayAdminViews.rolePicker(guildId, Number(arg) || 0);

      case GiveawayAdminAction.RoleClear:
        await GiveawayRepository.updateSettings(guildId, { pingRoleId: null });
        return GiveawayAdminViews.settings(client, guildId);

      default:
        return GiveawayAdminViews.root(client, guildId);
    }
  }
}
