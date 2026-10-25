import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, StringSelectMenuInteraction } from "discord.js";

import { ScheduleContainer } from "../lib/scheduleContainer.js";
import { ScheduleAction, ScheduleCustomIds } from "../lib/scheduleCustomIds.js";
import { ScheduleResponder } from "../lib/scheduleResponder.js";
import { ScheduleView } from "../lib/scheduleView.js";
import { GradeService } from "../service/gradeService.js";
import { LessonService } from "../service/lessonService.js";

const SELECT_ACTIONS = new Set<ScheduleAction>([
  ScheduleAction.Open,
  ScheduleAction.GradePick,
  ScheduleAction.Absent,
  ScheduleAction.GradeDelete,
]);

export class ScheduleSelectHandler extends InteractionHandler {
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
    const parsed = ScheduleCustomIds.parseTeacher(interaction.customId);

    return parsed && SELECT_ACTIONS.has(parsed.action) ? this.some({ ...parsed, values: interaction.values }) : this.none();
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    result: { action: ScheduleAction; args: string[]; values: string[] },
  ) {
    const teacherId = interaction.user.id;
    const [lessonId] = result.args;
    const [value] = result.values;

    try {
      if (result.action === ScheduleAction.GradePick) {
        await interaction.showModal(ScheduleContainer.gradeModal(await LessonService.owned(teacherId, lessonId), value));
        return;
      }

      await interaction.deferUpdate();
      await LessonService.assertTeacher(interaction);

      let notice: string | null = null;

      if (result.action === ScheduleAction.Absent) {
        await LessonService.markAbsent(teacherId, lessonId, result.values);
        notice = result.values.length ? `Отсутствовавших: ${result.values.length}. Посещаемость сохранена.` : "Отмечено, что были все ученики.";
      }

      if (result.action === ScheduleAction.GradeDelete) {
        await GradeService.remove(teacherId, lessonId, value);
        notice = "Оценка удалена.";
      }

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [await ScheduleView.lesson(teacherId, result.action === ScheduleAction.Open ? value : lessonId, notice)],
      });
    } catch (error) {
      await ScheduleResponder.error(interaction, error);
    }
  }
}
