import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import {
  ActionRowBuilder,
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

export class ChangePrefixButton extends InteractionHandler {
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
    if (!interaction.customId.startsWith("tupper_prefix_")) {
      return this.none();
    }

    return this.some({
      characterId: interaction.customId.replace("tupper_prefix_", ""),
    });
  }

  public override async run(
    interaction: ButtonInteraction,
    result: { characterId: string },
  ) {
    const modal = new ModalBuilder()
      .setCustomId(`tupper_prefix_modal_${result.characterId}`)
      .setTitle("Изменение тега");

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("prefix")
          .setLabel("Новый тег")
          .setPlaceholder("[Гарри]")
          .setRequired(true)
          .setStyle(TextInputStyle.Short)
          .setMaxLength(32),
      ),
    );

    await interaction.showModal(modal);
  }
}
