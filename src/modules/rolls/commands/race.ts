import { Command } from "@sapphire/framework";
import { MessageFlags, type ChatInputCommandInteraction } from "discord.js";

import { CommandAccess } from "../../permissions/types/permissions.js";
import { RollResponder } from "../lib/rollResponder.js";
import { RollKind } from "../types/rolls.js";

export class RaceCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "race",
      description: "Бросок кубика расы",
      access: CommandAccess.Restricted,
    });
  }

  public override registerApplicationCommands(registry: Command.Registry) {
    registry.registerChatInputCommand((builder) =>
      builder.setName(this.name).setDescription(this.description),
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [await RollResponder.build(RollKind.RACE)],
      });
    } catch (error) {
      await RollResponder.error(interaction, error);
    }
  }
}
