import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, ModalSubmitInteraction } from "discord.js";

import { TUPPER_EDIT_FIELD, TUPPER_EDIT_MODAL } from "../commands/tupperEdit.js";
import { TupperMessageActions, TupperMessageError } from "../service/tupperMessageActions.js";

export class TupperEditModalHandler extends InteractionHandler {
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
    const [prefix, messageId] = interaction.customId.split(":");

    return prefix === TUPPER_EDIT_MODAL && messageId ? this.some(messageId) : this.none();
  }

  public override async run(interaction: ModalSubmitInteraction, messageId: string) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      await TupperMessageActions.edit(
        interaction.client,
        messageId,
        interaction.user.id,
        interaction.fields.getTextInputValue(TUPPER_EDIT_FIELD),
      );

      await interaction.deleteReply().catch(() => null);
    } catch (error) {
      if (!(error instanceof TupperMessageError)) {
        this.container.logger.error(error);
      }

      await interaction
        .editReply({
          content: error instanceof TupperMessageError ? error.message : "Не удалось изменить сообщение. Попробуйте позже.",
        })
        .catch(() => null);
    }
  }
}
