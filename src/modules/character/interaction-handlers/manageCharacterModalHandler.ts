import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { ModalSubmitInteraction, MessageFlags } from "discord.js";
import { CharacterFaculty } from "../../../database/generated/prisma/client.js";
import { CharacterService } from "../service/characterService.js";
import { ManageCharacterContainer } from "../lib/manageCharacterContainer.js";
import { PermissionService } from "../../permissions/service/permissionService.js";

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
    if (!(await PermissionService.canUse(interaction, "manage-character"))) {
      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [
          ManageCharacterContainer.createError("У вас нет доступа к этой команде."),
        ],
      });
      return;
    }

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

    try {
      await CharacterService.create(result.userId, rpName, avatarUrl, faculty);
    } catch (error) {
      this.container.logger.error(error);

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [
          ManageCharacterContainer.createError(
            "Не удалось создать персонажа. Попробуйте ещё раз.",
          ),
        ],
      });

      return;
    }

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
