import { Command } from "@sapphire/framework";
import { MessageFlags, type ChatInputCommandInteraction } from "discord.js";

import { RollContainer } from "../lib/rollContainer.js";
import { ROLL_KINDS } from "../lib/rollKinds.js";
import { RollResponder } from "../lib/rollResponder.js";
import { RollService } from "../service/rollService.js";
import { RollKind } from "../types/rolls.js";

export class TraitsCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "traits",
      description: "Все магические особенности и шансы их выпадения",
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
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [
          RollContainer.catalog(ROLL_KINDS[RollKind.TRAIT], await RollService.list(RollKind.TRAIT)),
        ],
      });
    } catch (error) {
      await RollResponder.error(interaction, error);
    }
  }
}
