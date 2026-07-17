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

export class ChangeNameButton extends InteractionHandler {
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
    if (!interaction.customId.startsWith("tupper_name_")) {
      return this.none();
    }

    return this.some({
      characterId: interaction.customId.replace("tupper_name_", ""),
    });
  }

  public override async run(
    interaction: ButtonInteraction,
    result: { characterId: string },
  ) {
    const modal = new ModalBuilder()
      .setCustomId(
        `tupper_name_modal:${result.characterId}:${interaction.channelId}:${interaction.message.id}`,
      )
      .setTitle("Изменение имени");

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("name")
          .setLabel("Новое имя")
          .setRequired(true)
          .setMaxLength(80)
          .setStyle(TextInputStyle.Short),
      ),
    );

    await interaction.showModal(modal);
  }
}
