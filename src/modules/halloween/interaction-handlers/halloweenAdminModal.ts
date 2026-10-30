import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, ModalSubmitInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { HalloweenAdminAction, HalloweenContainer } from "../lib/halloweenContainer.js";
import { HalloweenViews } from "../lib/halloweenViews.js";
import { HalloweenAdmin } from "../service/halloweenAdmin.js";
import { HalloweenService } from "../service/halloweenService.js";

const MODALS = new Set<HalloweenAdminAction>([
  HalloweenAdminAction.SettingsModal,
  HalloweenAdminAction.ChannelsModal,
  HalloweenAdminAction.OfferModal,
]);

export class HalloweenAdminModalHandler extends InteractionHandler {
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
    const parsed = HalloweenContainer.parse("hweenadm", HalloweenAdminAction, interaction.customId);

    return parsed && MODALS.has(parsed.action) ? this.some(parsed) : this.none();
  }

  public override async run(interaction: ModalSubmitInteraction, result: { action: HalloweenAdminAction; args: string[] }) {
    try {
      await ManageResponder.defer(interaction);

      const guildId = await HalloweenService.assertCanManage(interaction);
      const field = (id: string) => interaction.fields.getTextInputValue(id);

      const view = await (async () => {
        switch (result.action) {
          case HalloweenAdminAction.SettingsModal:
            await HalloweenAdmin.saveSettings(guildId, field);
            return HalloweenViews.admin(guildId, "Настройки сохранены.");
          case HalloweenAdminAction.ChannelsModal: {
            const count = await HalloweenAdmin.saveChannels(interaction, guildId);
            return HalloweenViews.admin(guildId, count ? `Каналов для тыкв: ${count}.` : "Каналы очищены — тыквы появляться не будут.");
          }
          default:
            await HalloweenAdmin.saveOffer(result.args[0], field);
            return HalloweenViews.offers("Цена сохранена.");
        }
      })();

      await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [view] });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
