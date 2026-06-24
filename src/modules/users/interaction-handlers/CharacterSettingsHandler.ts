import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { ButtonInteraction, MessageFlags, ButtonBuilder } from "discord.js";
import { CharacterService } from "../../character/service/characterService.js";
import { ProfileComponents } from "../lib/profileComponents.js";

export class CharacterSettingsButtonHandler extends InteractionHandler {
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
    if (!interaction.customId.startsWith("character_settings_")) {
      return this.none();
    }

    const targetUserId = interaction.customId.replace(
      "character_settings_",
      "",
    );

    return this.some({ targetUserId });
  }

  public override async run(
    interaction: ButtonInteraction,
    result: { targetUserId: string },
  ) {
    if (interaction.user.id !== result.targetUserId) {
      await interaction.reply({
        content: "❌ Вы можете управлять только собственным персонажем.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const characters = await CharacterService.getCharacters(
      result.targetUserId,
    );

    if (!characters || characters.length === 0) {
      const freshMenuRows = ProfileComponents.createMenu(result.targetUserId);

      const updatedRows = freshMenuRows.map((row) => {
        row.components.forEach((component) => {
          if (
            component instanceof ButtonBuilder &&
            (component.data as any).custom_id === interaction.customId
          ) {
            component.setDisabled(true);
          }
        });
        return row;
      });

      await interaction.update({
        components: updatedRows as any,
      });

      await interaction.followUp({
        content: "⚠️ У вас нет активных персонажей для управления.",
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      });
      return;
    }

    await interaction.reply({
      content: "🔧 Данная функция находится в разработке...",
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
    });
  }
}
