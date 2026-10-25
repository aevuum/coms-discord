import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, ModalSubmitInteraction } from "discord.js";

import { GradeWorkType, LessonStatus } from "../../../database/generated/prisma/client.js";

import { WORK_TYPE_LABELS } from "../lib/gradeMath.js";
import { ScheduleAction, ScheduleCustomIds, ScheduleFields } from "../lib/scheduleCustomIds.js";
import { ScheduleResponder } from "../lib/scheduleResponder.js";
import { ScheduleView } from "../lib/scheduleView.js";
import { GradeService } from "../service/gradeService.js";
import { LessonService } from "../service/lessonService.js";

const MODAL_ACTIONS = new Set<ScheduleAction>([
  ScheduleAction.CreateModal,
  ScheduleAction.EditModal,
  ScheduleAction.CancelModal,
  ScheduleAction.GradeModal,
]);

export class ScheduleModalHandler extends InteractionHandler {
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
    const parsed = ScheduleCustomIds.parseTeacher(interaction.customId);

    return parsed && MODAL_ACTIONS.has(parsed.action) ? this.some(parsed) : this.none();
  }

  public override async run(interaction: ModalSubmitInteraction, result: { action: ScheduleAction; args: string[] }) {
    const teacherId = interaction.user.id;
    const [lessonId, characterId] = result.args;
    const field = (id: string) => interaction.fields.getTextInputValue(id);
    const select = (id: string) => interaction.fields.getStringSelectValues(id)[0] ?? "";
    const channel = () => interaction.fields.getSelectedChannels(ScheduleFields.Channel)?.first()?.id ?? null;

    try {
      if (interaction.isFromMessage()) {
        await interaction.deferUpdate();
      } else {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }

      const guildId = await LessonService.assertTeacher(interaction);

      switch (result.action) {
        case ScheduleAction.CreateModal: {
          const lesson = await LessonService.create(interaction.client, guildId, teacherId, {
            subjectId: select(ScheduleFields.Subject),
            topic: field(ScheduleFields.Topic),
            startsAt: field(ScheduleFields.StartsAt),
            channelId: channel(),
            capacity: field(ScheduleFields.Capacity),
          });

          return await this.home(
            interaction,
            await ScheduleView.home(interaction, `«${lesson.topic}» добавлено в расписание и отправлено на проверку администрации.`, ScheduleView.weekOffset(lesson.startsAt)),
          );
        }

        case ScheduleAction.EditModal: {
          const { lesson, rescheduled } = await LessonService.update(interaction.client, teacherId, lessonId, {
            topic: field(ScheduleFields.Topic),
            startsAt: field(ScheduleFields.StartsAt),
            channelId: channel(),
            capacity: field(ScheduleFields.Capacity),
          });

          return await this.home(
            interaction,
            await ScheduleView.home(
              interaction,
              rescheduled
                ? "Занятие перенесено, записавшимся отправлены уведомления."
                : lesson.status === LessonStatus.PENDING
                  ? "Занятие изменено и отправлено на проверку."
                  : "Занятие изменено.",
              ScheduleView.weekOffset(lesson.startsAt),
            ),
          );
        }

        case ScheduleAction.CancelModal: {
          const cancelled = await LessonService.cancel(interaction.client, lessonId, field(ScheduleFields.Reason), teacherId);

          return await this.home(
            interaction,
            await ScheduleView.home(interaction, "Занятие отменено, записавшиеся получат уведомление.", ScheduleView.weekOffset(cancelled.startsAt)),
          );
        }

        default: {
          const grade = await GradeService.add(teacherId, lessonId, characterId, {
            title: field(ScheduleFields.Title),
            workType: select(ScheduleFields.WorkType),
            value: select(ScheduleFields.Value),
          });

          const type = WORK_TYPE_LABELS[select(ScheduleFields.WorkType) as GradeWorkType] ?? "";

          return await this.reply(
            interaction,
            await ScheduleView.lesson(teacherId, lessonId, `${grade.name}: **${grade.value}** за «${grade.title}» (${type.toLowerCase()}).`),
          );
        }
      }
    } catch (error) {
      await ScheduleResponder.error(interaction, error);
    }
  }

  private async reply(interaction: ModalSubmitInteraction, component: Awaited<ReturnType<typeof ScheduleView.lesson>>) {
    await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [component], attachments: [] });
  }

  private async home(interaction: ModalSubmitInteraction, view: Awaited<ReturnType<typeof ScheduleView.home>>) {
    await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: view.components, files: view.files, attachments: [] });
  }
}
