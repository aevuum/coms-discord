import { ApplicationCommandRegistry, Command } from "@sapphire/framework";

import {
  ApplicationCommandType,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type ContextMenuCommandInteraction,
} from "discord.js";

import { TupperMessageActions, TupperMessageError } from "../service/tupperMessageActions.js";

export const TUPPER_EDIT_MENU = "Изменить сообщение туппера";
export const TUPPER_EDIT_MODAL = "tupper_edit";
export const TUPPER_EDIT_FIELD = "content";

export class TupperEditCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "tupper-edit",
      description: "Изменить текст своего сообщения от туппера",
    });
  }

  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerContextMenuCommand((builder) =>
      builder.setName(TUPPER_EDIT_MENU).setType(ApplicationCommandType.Message),
    );
  }

  public override async contextMenuRun(interaction: ContextMenuCommandInteraction) {
    if (!interaction.isMessageContextMenuCommand()) {
      return;
    }

    const message = interaction.targetMessage;

    try {
      await TupperMessageActions.assertOwner(message.id, interaction.user.id);

      const content = new TextInputBuilder()
        .setCustomId(TUPPER_EDIT_FIELD)
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(2000);

      if (message.content) {
        content.setValue(message.content.slice(0, 2000));
      }

      await interaction.showModal(
        new ModalBuilder()
          .setCustomId(`${TUPPER_EDIT_MODAL}:${message.id}`)
          .setTitle("Изменить сообщение")
          .addLabelComponents(
            new LabelBuilder()
              .setLabel("Текст")
              .setDescription("Заклинания в сообщении повторно не применяются")
              .setTextInputComponent(content),
          ),
      );
    } catch (error) {
      if (!(error instanceof TupperMessageError)) {
        this.container.logger.error(error);
      }

      await interaction
        .reply({
          flags: MessageFlags.Ephemeral,
          content: error instanceof TupperMessageError ? error.message : "Не удалось открыть редактирование. Попробуйте позже.",
        })
        .catch(() => null);
    }
  }
}
