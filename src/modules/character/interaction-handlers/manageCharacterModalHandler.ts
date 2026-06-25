import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { ModalSubmitInteraction, MessageFlags } from "discord.js";
import { CharacterFaculty } from "../../../database/generated/prisma/client.js";
import { CharacterService } from "../service/characterService.js";
import { ManageCharacterContainer } from "../lib/manageCharacterContainer.js";

export class ManageCharacterModalHandler extends InteractionHandler {
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
    if (!interaction.customId.startsWith("manage_character_modal_")) {
      return this.none();
    }

    const userId = interaction.customId.replace("manage_character_modal_", "");

    return this.some({
      userId,
    });
  }

  public override async run(
    interaction: ModalSubmitInteraction,
    result: {
      userId: string;
    },
  ) {
    const rpName = interaction.fields.getTextInputValue("character_name");
    const faculty = interaction.fields.getStringSelectValues(
      "character_faculty",
    )[0] as CharacterFaculty;

    let avatarUrl: string | null = null;
    const files = interaction.fields.getUploadedFiles("character_avatar");

    if (files && files.size > 0) {
      const file = files.first();
      if (file) {
        avatarUrl = file.url;
      }
    }

    await CharacterService.create(result.userId, rpName, avatarUrl, faculty);

    await interaction.reply({
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      components: [
        ManageCharacterContainer.createSuccess(
          "<:48765whitearrow:1518587298281685173> Персонаж успешно создан.",
        ),
      ],
    });
  }
}
