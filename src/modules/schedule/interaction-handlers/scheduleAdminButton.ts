import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags, type ContainerBuilder } from "discord.js";

import { LessonCard } from "../lib/lessonCard.js";
import { ScheduleAdminContainer } from "../lib/scheduleAdminContainer.js";
import { ScheduleAdminViews } from "../lib/scheduleAdminViews.js";
import { ScheduleContainer } from "../lib/scheduleContainer.js";
import { REVIEW_FLAG, ScheduleAdminAction, ScheduleCustomIds } from "../lib/scheduleCustomIds.js";
import { ScheduleResponder } from "../lib/scheduleResponder.js";
import { ScheduleRepository } from "../repositories/scheduleRepository.js";
import { LessonService } from "../service/lessonService.js";
import { SubjectService } from "../service/subjectService.js";

const BUTTON_ACTIONS = new Set<ScheduleAdminAction>([
  ScheduleAdminAction.Root,
  ScheduleAdminAction.Approve,
  ScheduleAdminAction.Reject,
  ScheduleAdminAction.Cancel,
  ScheduleAdminAction.Subjects,
  ScheduleAdminAction.SubjectCreate,
  ScheduleAdminAction.SubjectEdit,
  ScheduleAdminAction.SubjectToggle,
  ScheduleAdminAction.Settings,
]);

export class ScheduleAdminButtonHandler extends InteractionHandler {
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
    const parsed = ScheduleCustomIds.parseAdmin(interaction.customId);

    return parsed && BUTTON_ACTIONS.has(parsed.action) ? this.some(parsed) : this.none();
  }

  public override async run(interaction: ButtonInteraction, result: { action: ScheduleAdminAction; args: string[] }) {
    const [id, flag] = result.args;

    try {
      switch (result.action) {
        case ScheduleAdminAction.Reject:
          await interaction.showModal(
            ScheduleContainer.reasonModal(
              ScheduleCustomIds.admin(ScheduleAdminAction.RejectModal, id, ...(flag ? [flag] : [])),
              "Отклонить занятие",
              "Что исправить преподавателю",
              true,
            ),
          );
          return;

        case ScheduleAdminAction.Cancel:
          await interaction.showModal(
            ScheduleContainer.reasonModal(ScheduleCustomIds.admin(ScheduleAdminAction.CancelModal, id), "Отмена занятия", "Причина отмены", false),
          );
          return;

        case ScheduleAdminAction.SubjectCreate:
          await interaction.showModal(ScheduleAdminContainer.subjectModal(null));
          return;

        case ScheduleAdminAction.SubjectEdit:
          await interaction.showModal(ScheduleAdminContainer.subjectModal(await SubjectService.get(id)));
          return;

        case ScheduleAdminAction.Settings: {
          const guildId = await LessonService.assertAdmin(interaction);

          await interaction.showModal(ScheduleAdminContainer.settingsModal(await ScheduleRepository.settings(guildId), interaction.inGuild()));
          return;
        }
      }

      await interaction.deferUpdate();

      const guildId = await LessonService.assertAdmin(interaction);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [await this.resolve(interaction, guildId, result.action, id, flag)],
      });
    } catch (error) {
      await ScheduleResponder.error(interaction, error);
    }
  }

  private async resolve(
    interaction: ButtonInteraction,
    guildId: string,
    action: ScheduleAdminAction,
    id: string,
    flag: string | undefined,
  ): Promise<ContainerBuilder> {
    switch (action) {
      case ScheduleAdminAction.Approve: {
        const lesson = await LessonService.approve(interaction.client, id, interaction.user.id);

        return flag === REVIEW_FLAG
          ? LessonCard.review(lesson)
          : ScheduleAdminViews.lesson(lesson.id, "Занятие утверждено, карточка опубликована в кабинете.");
      }

      case ScheduleAdminAction.Subjects:
        return ScheduleAdminViews.subjects();

      case ScheduleAdminAction.SubjectToggle: {
        const subject = await SubjectService.toggle(id);

        return ScheduleAdminViews.subject(subject.id, subject.active ? "Предмет снова доступен." : "Предмет скрыт.");
      }

      default:
        return ScheduleAdminViews.root(guildId);
    }
  }
}
