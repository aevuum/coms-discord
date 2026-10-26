import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags } from "discord.js";

import { ScheduleContainer } from "../lib/scheduleContainer.js";
import { ScheduleAction, ScheduleCustomIds } from "../lib/scheduleCustomIds.js";
import { ScheduleResponder } from "../lib/scheduleResponder.js";
import { ScheduleView } from "../lib/scheduleView.js";
import { ScheduleRepository } from "../repositories/scheduleRepository.js";
import { LessonService } from "../service/lessonService.js";
import { ScheduleError } from "../types/schedule.js";

const BUTTON_ACTIONS = new Set<ScheduleAction>([
  ScheduleAction.Home,
  ScheduleAction.Create,
  ScheduleAction.Edit,
  ScheduleAction.Cancel,
]);

export class ScheduleButtonHandler extends InteractionHandler {
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
    const parsed = ScheduleCustomIds.parseTeacher(interaction.customId);

    return parsed && BUTTON_ACTIONS.has(parsed.action) ? this.some(parsed) : this.none();
  }

  public override async run(interaction: ButtonInteraction, result: { action: ScheduleAction; args: string[] }) {
    const teacherId = interaction.user.id;
    const [lessonId] = result.args;

    try {
      switch (result.action) {
        case ScheduleAction.Create: {
          const subjects = await ScheduleRepository.subjects();

          if (!subjects.length) {
            throw new ScheduleError("Администрация ещё не добавила ни одного предмета.");
          }

          await interaction.showModal(ScheduleContainer.createModal(subjects, interaction.inGuild()));
          return;
        }

        case ScheduleAction.Edit:
          await interaction.showModal(ScheduleContainer.editModal(await LessonService.owned(teacherId, lessonId), interaction.inGuild()));
          return;

        case ScheduleAction.Cancel:
          await LessonService.owned(teacherId, lessonId);
          await interaction.showModal(
            ScheduleContainer.reasonModal(
              ScheduleCustomIds.teacher(ScheduleAction.CancelModal, lessonId),
              "Отмена занятия",
              "Причина отмены",
              false,
            ),
          );
          return;

        default: {
          await interaction.deferUpdate();
          await LessonService.assertTeacher(interaction);

          const home = await ScheduleView.home(interaction, null, Number(result.args[0]) || 0);

          await interaction.editReply({
            flags: MessageFlags.IsComponentsV2,
            components: home.components,
            files: home.files,
            attachments: [],
          });
        }
      }
    } catch (error) {
      await ScheduleResponder.error(interaction, error);
    }
  }
}
