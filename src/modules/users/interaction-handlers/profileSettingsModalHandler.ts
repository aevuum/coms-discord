import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import {
  ModalSubmitInteraction,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} from "discord.js";

import { MediaService } from "../../media/service/mediaService.js";
import { UserRepository } from "../repositories/userRepository.js";
import { ProfileService } from "../service/profileService.js";

export class ProfileSettingsModalHandler extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
    });
  }

  public override parse(interaction: ModalSubmitInteraction) {
    if (!interaction.customId.startsWith("profile_settings_modal_")) {
      return this.none();
    }

    return this.some();
  }

  public override async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const discordId = interaction.user.id;

    try {
      const attachment = interaction.fields
        .getUploadedFiles("profile_banner_file")
        ?.first();

      if (attachment) {
        const profile = await ProfileService.getOrCreateProfile(discordId);

        const banner = await MediaService.saveAttachment(attachment);

        await UserRepository.updateBanner(discordId, banner.url, banner.id);

        await MediaService.delete(profile.profileBannerImageId);
      }

      const selectedAwardId =
        interaction.fields
          .getStringSelectValues("profile_primary_awardid")
          ?.at(0) ?? null;

      if (selectedAwardId) {
        await UserRepository.updateSelectedAward(discordId, selectedAwardId);
      }

      await this.reply(
        interaction,
        "<:312537mark:1518581040548024430> Настройки профиля успешно обновлены.",
      );
    } catch (error) {
      if (!(error instanceof Error && error.name === "MediaError")) {
        this.container.logger.error(error);
      }

      await this.reply(
        interaction,
        `<:240191mark:1518581039172292688> ${
          error instanceof Error && error.name === "MediaError"
            ? error.message
            : "Не удалось сохранить настройки профиля. Попробуйте позже."
        }`,
      );
    }
  }

  private async reply(interaction: ModalSubmitInteraction, text: string) {
    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(text),
        ),
      ],
    });
  }
}
