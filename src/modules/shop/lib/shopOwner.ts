import { MessageFlags, type MessageComponentInteraction } from "discord.js";

import { ShopContainer } from "./shopContainer.js";

export class ShopOwner {
  public static async guard(interaction: MessageComponentInteraction) {
    const ownerId = interaction.message.interactionMetadata?.user.id;

    if (!ownerId || ownerId === interaction.user.id) {
      return true;
    }

    await interaction.reply({
      flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
      components: [
        ShopContainer.error("Это чужой магазин. Откройте свой командой /shop."),
      ],
    });

    return false;
  }
}
