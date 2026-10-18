import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { MessageFlags, type ButtonInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { RollAdminContainer } from "../lib/rollAdminContainer.js";
import { RollAdminViews } from "../lib/rollAdminViews.js";
import { RollAdminAction, RollCustomIds } from "../lib/rollCustomIds.js";
import { ROLL_KINDS } from "../lib/rollKinds.js";
import { RollService } from "../service/rollService.js";

const BUTTON_ACTIONS = new Set<RollAdminAction>([
  RollAdminAction.Root,
  RollAdminAction.Kind,
  RollAdminAction.View,
  RollAdminAction.Add,
  RollAdminAction.Edit,
  RollAdminAction.Delete,
  RollAdminAction.DeleteConfirm,
]);

export class RollAdminButtonHandler extends InteractionHandler {
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
    const parsed = RollCustomIds.parseAdmin(interaction.customId);

    if (!parsed || !BUTTON_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ButtonInteraction,
    result: { action: RollAdminAction; args: string[] },
  ) {
    const [arg] = result.args;

    try {
      if (result.action === RollAdminAction.Add) {
        await interaction.showModal(RollAdminContainer.modal(RollAdminViews.meta(arg)));
        return;
      }

      if (result.action === RollAdminAction.Edit) {
        const entry = await RollService.get(arg);

        await interaction.showModal(RollAdminContainer.modal(ROLL_KINDS[entry.kind], entry));
        return;
      }

      await interaction.deferUpdate();

      await RollService.assertCanManage(interaction);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [await this.resolve(result.action, arg)],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }

  private async resolve(action: RollAdminAction, arg: string) {
    switch (action) {
      case RollAdminAction.Kind:
        return RollAdminViews.list(arg);

      case RollAdminAction.View:
        return RollAdminViews.view(arg);

      case RollAdminAction.Delete: {
        const entry = await RollService.get(arg);

        return RollAdminContainer.deleteConfirm(ROLL_KINDS[entry.kind], entry);
      }

      case RollAdminAction.DeleteConfirm: {
        const entry = await RollService.delete(arg);

        return RollAdminViews.list(ROLL_KINDS[entry.kind].slug);
      }

      default:
        return RollAdminViews.root();
    }
  }
}
