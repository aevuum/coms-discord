import { ApplicationCommandRegistry, Command } from "@sapphire/framework";

import { ChatInputCommandInteraction, MessageFlags } from "discord.js";

import { ShopContainer } from "../lib/shopContainer.js";
import { ShopResponder } from "../lib/shopResponder.js";
import { ShopService } from "../service/shopService.js";

export class ShopCommand extends Command {
  public constructor(context: Command.LoaderContext, options: Command.Options) {
    super(context, {
      ...options,
      name: "shop",
      description: "Магазин за комс-коины",
    });
  }

  public override registerApplicationCommands(
    registry: ApplicationCommandRegistry,
  ) {
    registry.registerChatInputCommand((builder) =>
      builder
        .setName("shop")
        .setDescription("Открыть магазин нон-рп предметов за комс-коины"),
    );
  }

  public override async chatInputRun(interaction: ChatInputCommandInteraction) {
    try {
      const storefront = await ShopService.getStorefront(interaction.user.id);

      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [
          ShopContainer.storefront(storefront.items, storefront.balance),
        ],
      });
    } catch (error) {
      await ShopResponder.error(interaction, error);
    }
  }
}
