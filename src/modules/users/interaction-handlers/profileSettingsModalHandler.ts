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
import { UserRepository } from "../repositories/userRepository.js";

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

    const targetDiscordId = interaction.customId.replace(
      "profile_settings_modal_",
      "",
    );
    return this.some({ targetDiscordId });
  }

  public override async run(
    interaction: ModalSubmitInteraction,
    result: { targetDiscordId: string },
  ) {
    const uploadedFiles = (interaction.fields as any).getUploadedFiles(
      "profile_banner_file",
    );
    const attachment = uploadedFiles?.first();
    const bannerUrl = attachment?.url ?? null;

    if (bannerUrl && !attachment.contentType?.startsWith("image/")) {
      const errorContainer = new ContainerBuilder().addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "<:240191mark:1518581039172292688> Разрешено загружать только изображения.",
        ),
      );

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [errorContainer],
      });
      return;
    }

    await UserRepository.updateBanner(result.targetDiscordId, bannerUrl);

    const successContainer = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "<:312537mark:1518581040548024430> Баннер профиля успешно обновлён.",
      ),
    );

    await interaction.reply({
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      components: [successContainer],
    });
  }
}
