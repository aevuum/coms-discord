import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import {
  ModalSubmitInteraction,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
} from "discord.js";

import { EconomyAction, EconomyCustomIds } from "../lib/economyCustomIds.js";

import { EconomyService } from "../services/economyService.js";
import { Currency } from "../lib/currency.js";

export class EconomyTransferModalHandler extends InteractionHandler {
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
    const parsed = EconomyCustomIds.parse(interaction.customId);

    if (!parsed || parsed.action !== EconomyAction.TransferModal) {
      return this.none();
    }

    return this.some({
      senderId: parsed.args[0],
      receiverId: parsed.args[1],
    });
  }

  public override async run(
    interaction: ModalSubmitInteraction,
    result: {
      senderId: string;
      receiverId: string;
    },
  ) {
    try {
      const galleons = Number(
        interaction.fields.getTextInputValue("galleons") || "0",
      );

      const sickles = Number(
        interaction.fields.getTextInputValue("sickles") || "0",
      );

      const knuts = Number(
        interaction.fields.getTextInputValue("knuts") || "0",
      );

      await EconomyService.transfer(
        interaction.user.id,
        result.senderId,
        result.receiverId,
        `${galleons}г ${sickles}с ${knuts}к`,
      );

      const amount = Currency.toKnuts(galleons, sickles, knuts);

      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            "# <:766839verifiedgreen:1518587368636944534> Перевод выполнен",
            "",
            "<:48765whitearrow:1518587298281685173> Средства успешно переданы.",
            "",
            `### Сумма`,
            Currency.format(amount),
          ].join("\n"),
        ),
      );

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [container],
      });
    } catch (error) {
      const container = new ContainerBuilder();

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            "# <:83987delete:1518587334218627072> Ошибка",
            "",
            `<:48765whitearrow:1518587298281685173> ${
              error instanceof Error
                ? error.message
                : "Произошла неизвестная ошибка."
            }`,
          ].join("\n"),
        ),
      );

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [container],
      });
    }
  }
}
