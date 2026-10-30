import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, type ButtonInteraction, type StringSelectMenuInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { HalloweenAdminAction, HalloweenContainer } from "../lib/halloweenContainer.js";
import { HalloweenViews } from "../lib/halloweenViews.js";
import { HalloweenRepository } from "../repositories/halloweenRepository.js";
import { HalloweenAdmin } from "../service/halloweenAdmin.js";
import { HalloweenService } from "../service/halloweenService.js";
import { HalloweenError } from "../types/halloween.js";

export class HalloweenAdminComponentHandler extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.MessageComponent,
    });
  }

  public override parse(interaction: ButtonInteraction | StringSelectMenuInteraction) {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) {
      return this.none();
    }

    const parsed = HalloweenContainer.parse("hweenadm", HalloweenAdminAction, interaction.customId);

    return parsed ? this.some(parsed.action) : this.none();
  }

  public override async run(interaction: ButtonInteraction | StringSelectMenuInteraction, action: HalloweenAdminAction) {
    try {
      const guildId = await HalloweenService.assertCanManage(interaction);
      const value = interaction.isStringSelectMenu() ? interaction.values[0] : "";

      switch (action) {
        case HalloweenAdminAction.Settings:
          await interaction.showModal(HalloweenContainer.settingsModal(await HalloweenRepository.settings(guildId)));
          return;

        case HalloweenAdminAction.Channels:
          await interaction.showModal(HalloweenContainer.channelsModal(await HalloweenRepository.settings(guildId), interaction.inGuild()));
          return;

        case HalloweenAdminAction.OfferPick: {
          const item = await HalloweenRepository.shopItem(value);

          if (!item) {
            throw new HalloweenError("Товар не найден.");
          }

          const offer = await HalloweenRepository.offerFor(item.id);

          await interaction.showModal(HalloweenContainer.offerModal(item, offer));
          return;
        }
      }

      await interaction.deferUpdate();

      const view = await (async () => {
        switch (action) {
          case HalloweenAdminAction.Toggle:
            return HalloweenViews.admin(guildId, await HalloweenAdmin.toggle(guildId));
          case HalloweenAdminAction.Spawn: {
            const channelId = await HalloweenAdmin.spawnNow(interaction.client, guildId);
            return HalloweenViews.admin(guildId, `Тыква появилась в <#${channelId}>.`);
          }
          case HalloweenAdminAction.Offers:
            return HalloweenViews.offers();
          case HalloweenAdminAction.OfferRemove:
            await HalloweenRepository.removeOffer(value);
            return HalloweenViews.offers("Товар убран из лавки.");
          default:
            return HalloweenViews.admin(guildId);
        }
      })();

      await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [view] });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
