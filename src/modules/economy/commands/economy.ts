import { ApplicationCommandRegistry, Command } from "@sapphire/framework";

import { ChatInputCommandInteraction, MessageFlags } from "discord.js";

import { EconomyService } from "../services/economyService.js";
import { EconomyContainer } from "../lib/economyContainer.js";

export class EconomyCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "economy",
      description: "Экономика персонажа",
    });
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry,
  ) {
    registry.registerChatInputCommand((builder) =>
      builder.setName("economy").setDescription("Открыть экономику персонажа"),
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    const characters = await EconomyService.getCharacters(interaction.user.id);

    if (!characters.length) {
      await interaction.reply({
        content: "У вас нет зарегистрированных персонажей.",
        flags: MessageFlags.Ephemeral,
      });

      return;
    }

    if (characters.length === 1) {
      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],

        components: [EconomyContainer.main(characters[0])],
      });

      return;
    }

    await interaction.reply({
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],

      components: [
        EconomyContainer.selectCharacter(
          characters.map((character) => ({
            id: character.id,
            rpName: character.rpName,
          })),
        ),
      ],
    });
  }
}
