import { ApplicationCommandRegistry, Command } from "@sapphire/framework";

import { ChatInputCommandInteraction, MessageFlags } from "discord.js";

import { GradesView } from "../lib/gradesView.js";
import { ScheduleResponder } from "../lib/scheduleResponder.js";

export class GradesCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "grades",
      description: "Табель успеваемости персонажа",
    });
  }

  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("grades")
        .setDescription("Табель успеваемости: оценки и посещаемость персонажа")
        .addUserOption((option) =>
          option.setName("user").setDescription("Чей табель открыть (для преподавателей и администрации)").setRequired(false),
        ),
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    try {
      const owner = interaction.options.getUser("user") ?? interaction.user;
      const own = owner.id === interaction.user.id;

      await interaction.deferReply(own ? {} : { flags: MessageFlags.Ephemeral });

      const view = await GradesView.open(interaction, owner.id, null);

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
