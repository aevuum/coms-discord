import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, type ButtonInteraction, type StringSelectMenuInteraction } from "discord.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { HalloweenAction, HalloweenContainer } from "../lib/halloweenContainer.js";
import { HalloweenResponder } from "../lib/halloweenResponder.js";
import { HalloweenViews } from "../lib/halloweenViews.js";
import { HalloweenRepository } from "../repositories/halloweenRepository.js";
import { HalloweenService } from "../service/halloweenService.js";
import { HalloweenError } from "../types/halloween.js";

export class HalloweenComponentHandler extends InteractionHandler {
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

    const parsed = HalloweenContainer.parse("hween", HalloweenAction, interaction.customId);

    return parsed && parsed.action !== HalloweenAction.ExchangeModal ? this.some(parsed) : this.none();
  }

  public override async run(interaction: ButtonInteraction | StringSelectMenuInteraction, result: { action: HalloweenAction; args: string[] }) {
    try {
      const subject = await PermissionService.resolveSubject(interaction);

      if (!subject.guildId) {
        throw new HalloweenError("Вы не состоите на сервере бота.");
      }

      if (result.action === HalloweenAction.Exchange) {
        const kind = result.args[0] === "pumpkin" ? "pumpkin" : "candy";
        const settings = await HalloweenRepository.ensureItems(subject.guildId);
        const held = await HalloweenRepository.quantity(interaction.user.id, kind === "candy" ? settings.candyItemId : settings.pumpkinItemId);

        if (!held) {
          throw new HalloweenError(kind === "candy" ? "У вас нет конфет." : "У вас нет тыкв-артефактов.");
        }

        await interaction.showModal(HalloweenContainer.exchangeModal(kind, held, kind === "candy" ? settings.candyRate : settings.pumpkinRate));
        return;
      }

      await interaction.deferUpdate();

      const offerId = interaction.isStringSelectMenu() ? interaction.values[0] : "";
      const item = await HalloweenService.buy(interaction.user.id, subject.guildId, offerId);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        ...(await HalloweenViews.player(interaction.user.id, subject.guildId, `Куплено: **${item.name}**. Предмет уже в инвентаре профиля.`)),
        attachments: [],
      });
    } catch (error) {
      await HalloweenResponder.error(interaction, error);
    }
  }
}
