import { ApplicationCommandRegistry, Command } from "@sapphire/framework";

import { ChatInputCommandInteraction, MessageFlags } from "discord.js";

import { CommandAccess } from "../../permissions/types/permissions.js";
import { ScheduleResponder } from "../lib/scheduleResponder.js";
import { ScheduleView } from "../lib/scheduleView.js";
import { LessonService } from "../service/lessonService.js";
import { SCHEDULE_COMMAND } from "../types/schedule.js";

export class ScheduleCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: SCHEDULE_COMMAND,
      description: "Расписание занятий преподавателя",
      access: CommandAccess.Restricted,
    });
  }

  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(SCHEDULE_COMMAND).setDescription("Создать, изменить или отменить свои занятия"),
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      await LessonService.assertTeacher(interaction);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [await ScheduleView.home(interaction.user.id)],
      });
    } catch (error) {
      await ScheduleResponder.error(interaction, error);
    }
  }
}
