import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import {
  ActionRowBuilder,
  ModalBuilder,
  StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import { EconomyAction, EconomyCustomIds } from "../lib/economyCustomIds.js";

export class EconomyTransferCharacterSelectHandler extends InteractionHandler {
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
    const parsed = EconomyCustomIds.parse(interaction.customId);

    if (!parsed || parsed.action !== EconomyAction.TransferCharacter) {
      return this.none();
    }

    return this.some({
      senderId: parsed.args[0],
      receiverId: interaction.values[0],
    });
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    result: {
      senderId: string;
      receiverId: string;
    },
  ) {
    const modal = new ModalBuilder()
      .setCustomId(
        EconomyCustomIds.transferModal(result.senderId, result.receiverId),
      )
      .setTitle("Передача денег");

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("galleons")
          .setLabel("Галлеоны")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setValue("0"),
      ),

      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("sickles")
          .setLabel("Сикли")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setValue("0"),
      ),

      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("knuts")
          .setLabel("Кнаты")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setValue("0"),
      ),
    );

    await interaction.showModal(modal);
  }
}
