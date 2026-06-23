import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import {
  ButtonInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} from "discord.js";
import { ProfileSettingsModal } from "../lib/profileSettingsModal.js";
import { ProfileService } from "../service/profileService.js";

export class ProfileSettingsHandler extends InteractionHandler {
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
    if (!interaction.customId.startsWith("profile_settings_")) {
      return this.none();
    }

    const targetDiscordId = interaction.customId.replace(
      "profile_settings_",
      "",
    );
    return this.some({ targetDiscordId });
  }

  public override async run(
    interaction: ButtonInteraction,
    result: { targetDiscordId: string },
  ) {
    if (interaction.user.id !== result.targetDiscordId) {
      const errorContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "<:240191mark:1518581039172292688> Вы не можете настраивать чужой профиль.",
        ),
      );

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [errorContainer],
      });
      return;
    }

    const profile = await ProfileService.getOrCreateProfile(
      result.targetDiscordId,
    );

    await interaction.showModal(
      ProfileSettingsModal.create(
        result.targetDiscordId,
        profile.awards,
        profile.selectedAwardId ?? undefined,
      ),
    );
  }
}
