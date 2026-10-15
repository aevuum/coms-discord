import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { ButtonInteraction, MessageFlags } from "discord.js";
import { ManageCharacterContainer } from "../lib/manageCharacterContainer.js";
import { PermissionService } from "../../permissions/service/permissionService.js";

export class ManageCharacterButtonHandler extends InteractionHandler {
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
    if (!interaction.customId.startsWith("manage_character_")) {
      return this.none();
    }

    const action = interaction.customId.replace("manage_character_", "");

    return this.some({ action });
  }

  public override async run(
    interaction: ButtonInteraction,
    result: {
      action: "create" | "delete" | "freeze" | "unfreeze" | "kill";
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

    const states = {
      create: "select_user_create",
      delete: "select_user_delete",
      freeze: "select_user_freeze",
      unfreeze: "select_user_unfreeze",
      kill: "select_user_kill",
    } as const;

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [ManageCharacterContainer.build(states[result.action])],
    });
  }
}
