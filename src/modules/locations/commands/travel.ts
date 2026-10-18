import { ApplicationCommandRegistry, Command } from "@sapphire/framework";

import { ChatInputCommandInteraction, MessageFlags } from "discord.js";

import { TravelContainer } from "../lib/travelContainer.js";
import { TravelResponder } from "../lib/travelResponder.js";
import { TravelService } from "../service/travelService.js";

export class TravelCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "travel",
      description: "Путеводитель и перемещение между локациями",
    });
  }

  public override registerApplicationCommands(registry: ApplicationCommandRegistry) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("travel")
        .setDescription("Путеводитель: где вы находитесь и куда можно отправиться"),
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const member = await TravelService.getMember(interaction);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [TravelContainer.guide(await TravelService.getGuide(member))],
      });
    } catch (error) {
      await TravelResponder.error(interaction, error);
    }
  }
}
