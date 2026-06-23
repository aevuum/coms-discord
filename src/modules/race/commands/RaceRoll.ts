import { Command } from "@sapphire/framework";
import type { ChatInputCommandInteraction } from "discord.js";
import { RaceService } from "../service/raceService.js";

export class RaceRoll extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "race",
      description: "Бросок кубика расы",
      preconditions: ["RaceRoller"],
    });
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const race = RaceService.rollRace();
    const embed = RaceService.createEmbed(race);
    const row = RaceService.createButtonRow();

    await interaction.reply({
      embeds: [embed],
      components: [row],
    });
  }
}
