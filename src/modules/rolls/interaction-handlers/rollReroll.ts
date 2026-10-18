import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { MessageFlags, type ButtonInteraction } from "discord.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { RollCustomIds } from "../lib/rollCustomIds.js";
import { kindBySlug } from "../lib/rollKinds.js";
import { RollResponder } from "../lib/rollResponder.js";
import { RollError, type RollKindMeta } from "../types/rolls.js";

export class RollRerollHandler extends InteractionHandler {
  public constructor(
    context: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(context, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button,
    });
  }

  public override parse(interaction: ButtonInteraction) {
    const meta = kindBySlug(RollCustomIds.parseReroll(interaction.customId) ?? "");

    return meta ? this.some(meta) : this.none();
  }

  public override async run(interaction: ButtonInteraction, meta: RollKindMeta) {
    try {
      if (!(await PermissionService.canUse(interaction, meta.command))) {
        throw new RollError("У вас нет прав для использования кнопки перекрута.");
      }

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        content: null,
        embeds: [],
        components: [await RollResponder.build(meta.kind)],
      });
    } catch (error) {
      await RollResponder.error(interaction, error);
    }
  }
}
