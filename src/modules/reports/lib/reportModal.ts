import {
  FileUploadBuilder,
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} from "discord.js";

import { REPORT_MAX_IMAGES } from "./reportConfig.js";
import { ReportAction, ReportCustomIds, ReportModalFields } from "./reportCustomIds.js";

export type ReportModalContext = {
  channelId: string;
  messageId: string;
  authorId: string | null;
};

export class ReportModal {
  public static create(context: ReportModalContext | null) {
    const target = new UserSelectMenuBuilder()
      .setCustomId(ReportModalFields.Target)
      .setPlaceholder("Выберите участника")
      .setMinValues(1)
      .setMaxValues(1)
      .setRequired(true);

    if (context?.authorId) {
      target.setDefaultUsers(context.authorId);
    }

    const reason = new TextInputBuilder()
      .setCustomId(ReportModalFields.Reason)
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Например: 2.3")
      .setRequired(false)
      .setMaxLength(100);

    const description = new TextInputBuilder()
      .setCustomId(ReportModalFields.Description)
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Опишите, что произошло")
      .setRequired(true)
      .setMinLength(10)
      .setMaxLength(1500);

    const images = new FileUploadBuilder()
      .setCustomId(ReportModalFields.Images)
      .setMinValues(0)
      .setMaxValues(REPORT_MAX_IMAGES)
      .setRequired(false);

    const customId = context
      ? ReportCustomIds.build(ReportAction.Submit, context.channelId, context.messageId)
      : ReportCustomIds.build(ReportAction.Submit);

    return new ModalBuilder()
      .setCustomId(customId)
      .setTitle(context ? "Жалоба на сообщение" : "Жалоба на участника")
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Нарушитель")
          .setUserSelectMenuComponent(target),
        new LabelBuilder()
          .setLabel("Нарушенное правило")
          .setDescription("Номер или название пункта, если знаете")
          .setTextInputComponent(reason),
        new LabelBuilder()
          .setLabel("Суть проблемы")
          .setTextInputComponent(description),
        new LabelBuilder()
          .setLabel("Скриншоты")
          .setDescription(`До ${REPORT_MAX_IMAGES} изображений`)
          .setFileUploadComponent(images),
      );
  }
}
