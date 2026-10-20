import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import {
  MessageFlags,
  type ButtonInteraction,
  type Interaction,
  type StringSelectMenuInteraction,
} from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { SuggestionAdminAction, SuggestionAdminIds } from "../lib/suggestionAdminContainer.js";
import { SuggestionAdminService } from "../service/suggestionAdminService.js";

type AdminAction = {
  action: SuggestionAdminAction;
  page: number;
};

export class SuggestionAdminHandler extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.MessageComponent,
    });
  }

  public override parse(interaction: Interaction) {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) {
      return this.none();
    }

    const parsed = SuggestionAdminIds.parse(interaction.customId);

    return parsed ? this.some<AdminAction>(parsed) : this.none();
  }

  public override async run(interaction: ButtonInteraction | StringSelectMenuInteraction, result: AdminAction) {
    try {
      await interaction.deferUpdate();

      const guildId = await SuggestionAdminService.assertCanManage(interaction);
      const { client } = interaction;

      let view;

      switch (result.action) {
        case SuggestionAdminAction.RolePage:
          view = await SuggestionAdminService.rolePicker(guildId, result.page);
          break;

        case SuggestionAdminAction.RoleSet:
          await SuggestionAdminService.setPingRole(
            client,
            guildId,
            interaction.isStringSelectMenu() ? interaction.values[0] : null,
          );
          view = await SuggestionAdminService.root(client, guildId);
          break;

        case SuggestionAdminAction.RoleClear:
          await SuggestionAdminService.setPingRole(client, guildId, null);
          view = await SuggestionAdminService.root(client, guildId);
          break;

        default:
          view = await SuggestionAdminService.root(client, guildId);
      }

      await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [view] });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
