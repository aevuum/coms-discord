import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, ModalSubmitInteraction, type ContainerBuilder } from "discord.js";

import { LessonCard } from "../lib/lessonCard.js";
import { ScheduleAdminViews } from "../lib/scheduleAdminViews.js";
import { REVIEW_FLAG, ScheduleAdminAction, ScheduleCustomIds, ScheduleFields } from "../lib/scheduleCustomIds.js";
import { ScheduleResponder } from "../lib/scheduleResponder.js";
import { LessonService } from "../service/lessonService.js";
import { SubjectService } from "../service/subjectService.js";

const MODAL_ACTIONS = new Set<ScheduleAdminAction>([
  ScheduleAdminAction.RejectModal,
  ScheduleAdminAction.CancelModal,
  ScheduleAdminAction.SubjectModal,
  ScheduleAdminAction.SettingsModal,
]);

export class ScheduleAdminModalHandler extends InteractionHandler {
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
    const parsed = ScheduleCustomIds.parseAdmin(interaction.customId);

    return parsed && MODAL_ACTIONS.has(parsed.action) ? this.some(parsed) : this.none();
  }

  public override async run(interaction: ModalSubmitInteraction, result: { action: ScheduleAdminAction; args: string[] }) {
    try {
      if (interaction.isFromMessage()) {
        await interaction.deferUpdate();
      } else {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }

      const guildId = await LessonService.assertAdmin(interaction);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [await this.resolve(interaction, guildId, result.action, result.args)],
      });
    } catch (error) {
      await ScheduleResponder.error(interaction, error);
    }
  }

  private async resolve(
    interaction: ModalSubmitInteraction,
    guildId: string,
    action: ScheduleAdminAction,
    [id, flag]: string[],
  ): Promise<ContainerBuilder> {
    const field = (key: string) => interaction.fields.getTextInputValue(key);

    switch (action) {
      case ScheduleAdminAction.RejectModal: {
        const lesson = await LessonService.reject(interaction.client, id, interaction.user.id, field(ScheduleFields.Reason));

        return flag === REVIEW_FLAG ? LessonCard.review(lesson) : ScheduleAdminViews.lesson(lesson.id, "Занятие отклонено, преподаватель получит причину.");
      }

      case ScheduleAdminAction.CancelModal:
        await LessonService.cancel(interaction.client, id, field(ScheduleFields.Reason), null);

        return ScheduleAdminViews.lesson(id, "Занятие отменено.");

      case ScheduleAdminAction.SubjectModal: {
        const subject = await SubjectService.save(id === "new" ? null : id, {
          name: field(ScheduleFields.Name),
          emoji: field(ScheduleFields.Emoji),
          order: field(ScheduleFields.Order),
        });

        return ScheduleAdminViews.subject(subject.id, id === "new" ? "Предмет добавлен." : "Предмет изменён.");
      }

      default: {
        const channel = interaction.fields.getSelectedChannels(ScheduleFields.ReviewChannel)?.first() ?? null;

        await SubjectService.saveSettings(guildId, channel?.id ?? null, field(ScheduleFields.ReminderMinutes));

        return ScheduleAdminViews.root(guildId, "Настройки сохранены.");
      }
    }
  }
}
