import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { StringSelectMenuInteraction, MessageFlags } from "discord.js";
import { ProfileContainer } from "../lib/profileContainer.js";
import { ProfileService } from "../service/profileService.js";

export class ProfileMenuHandler extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.SelectMenu,
    });
  }

  public override parse(interaction: StringSelectMenuInteraction) {
    if (!interaction.customId.startsWith("profile_menu_")) {
      return this.none();
    }

    const targetUserId = interaction.customId.replace("profile_menu_", "");
    return this.some({ targetUserId });
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    result: { targetUserId: string },
  ) {
    await interaction.deferUpdate();

    const selectedTab = interaction.values[0] ?? "main";

    try {
      const targetUser = await interaction.client.users.fetch(
        result.targetUserId,
      );
      const profile = await ProfileService.getOrCreateProfile(targetUser.id);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        ...ProfileContainer.createMessagePayload(
          targetUser,
          profile,
          selectedTab,
        ),
      });
    } catch (error) {
      this.container.logger.error(error);
    }
  }
}
