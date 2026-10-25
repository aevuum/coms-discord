import { ApplicationCommandRegistry, Command } from "@sapphire/framework";

import { ChatInputCommandInteraction, MessageFlags } from "discord.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { ScheduleResponder } from "../lib/scheduleResponder.js";
import { ScheduleView } from "../lib/scheduleView.js";
import { TimetableView } from "../lib/timetableView.js";
import { SCHEDULE_COMMAND, SCHEDULE_TEACH_KEY, ScheduleError } from "../types/schedule.js";

export class ScheduleCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: SCHEDULE_COMMAND,
      description: "Расписание занятий",
    });
  }

  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(SCHEDULE_COMMAND).setDescription("Расписание занятий на неделю, для преподавателей — управление уроками"),
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const subject = await PermissionService.resolveSubject(interaction);

      if (!subject.guildId) {
        throw new ScheduleError("Вы не состоите на сервере бота.");
      }

      if (await PermissionService.canUse(subject, SCHEDULE_TEACH_KEY)) {
        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [await ScheduleView.home(interaction.user.id)],
        });
        return;
      }

      const view = await TimetableView.open(interaction.user.id, subject.guildId, null, 0);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: view.components,
        files: view.files,
      });
    } catch (error) {
      await ScheduleResponder.error(interaction, error);
    }
  }
}
