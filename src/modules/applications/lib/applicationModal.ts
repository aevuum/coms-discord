import {
  LabelBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import type { ApplicationQuestion } from "../types/application.js";
import {
  APPLICATION_ANSWER_MAX_LENGTH,
  APPLICATION_QUESTIONS_PER_MODAL,
  APPLICATION_TRIAL_POST_MAX_LENGTH,
  APPLICATION_TRIAL_POST_MIN_LENGTH,
} from "./applicationConfig.js";
import {
  ApplicationAction,
  ApplicationCustomIds,
  ApplicationModalFields,
} from "./applicationCustomIds.js";
import { TemplateParser } from "./templateParser.js";

export class ApplicationModal {
  public static totalParts(questions: ApplicationQuestion[]) {
    return Math.max(1, Math.ceil(questions.length / APPLICATION_QUESTIONS_PER_MODAL));
  }

  public static partRange(part: number) {
    const start = part * APPLICATION_QUESTIONS_PER_MODAL;

    return { start, end: start + APPLICATION_QUESTIONS_PER_MODAL };
  }

  public static part(
    customId: string,
    roleName: string,
    questions: ApplicationQuestion[],
    part: number,
  ) {
    const total = this.totalParts(questions);
    const { start, end } = this.partRange(part);

    const title = total > 1 ? `${roleName} · часть ${part + 1} из ${total}` : `Заявка: ${roleName}`;

    return new ModalBuilder()
      .setCustomId(customId)
      .setTitle(TemplateParser.shorten(title, 45))
      .addLabelComponents(
        questions.slice(start, end).map((question, offset) => this.label(question, start + offset)),
      );
  }

  public static trialPost(applicationId: string) {
    return new ModalBuilder()
      .setCustomId(ApplicationCustomIds.build(ApplicationAction.PostModal, applicationId))
      .setTitle("Пробный пост")
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Ваш пост")
          .setDescription(`Описание сцены от лица куратора, от ${APPLICATION_TRIAL_POST_MIN_LENGTH} символов`)
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(ApplicationModalFields.TrialPost)
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMinLength(APPLICATION_TRIAL_POST_MIN_LENGTH)
              .setMaxLength(APPLICATION_TRIAL_POST_MAX_LENGTH),
          ),
      );
  }

  public static rejectReason(applicationId: string) {
    return new ModalBuilder()
      .setCustomId(ApplicationCustomIds.build(ApplicationAction.RejectModal, applicationId))
      .setTitle("Отклонить заявку")
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Причина")
          .setDescription("Кандидат увидит её в личных сообщениях")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(ApplicationModalFields.RejectReason)
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(false)
              .setMaxLength(1000),
          ),
      );
  }

  private static label(question: ApplicationQuestion, index: number) {
    const input = new TextInputBuilder()
      .setCustomId(ApplicationCustomIds.question(index))
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(!question.optional)
      .setMaxLength(APPLICATION_ANSWER_MAX_LENGTH);

    const optionalTitle = `${question.title} (необязательно)`;

    const label = new LabelBuilder().setLabel(
      question.optional && optionalTitle.length <= 45 ? optionalTitle : question.title,
    );

    if (question.hint) {
      const { head, tail } = TemplateParser.split(question.hint, 100);

      label.setDescription(head);

      if (tail) {
        input.setPlaceholder(tail);
      }
    }

    return label.setTextInputComponent(input);
  }
}
