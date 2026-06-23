import { ApplicationCommandRegistry, Command } from "@sapphire/framework";
import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { ProfileService } from "../service/profileService.js";
import { ProfileContainer } from "../lib/profileContainer.js";

export class ProfileCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "profile",
      description: "Профиль игрока",
    });
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry,
  ) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("profile")
        .setDescription("Показать профиль игрока")
        .addUserOption((option) =>
          option.setName("user").setDescription("Игрок").setRequired(false),
        ),
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser("user") ?? interaction.user;
    const profile = await ProfileService.getOrCreateProfile(targetUser.id);

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      ...ProfileContainer.createMessagePayload(targetUser, profile, "main"),
    });
  }
}
