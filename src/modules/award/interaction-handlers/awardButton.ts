import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags } from "discord.js";

import { ManageComponents } from "../../manage/lib/manageComponents.js";
import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { AwardComponents } from "../lib/awardComponents.js";
import { AwardContainer } from "../lib/awardContainer.js";
import { AwardAction, AwardCustomIds } from "../lib/awardCustomIds.js";
import { AwardService } from "../service/awardService.js";

const BUTTON_ACTIONS = new Set<AwardAction>([
  AwardAction.Root,
  AwardAction.Create,
  AwardAction.Delete,
  AwardAction.DeleteConfirm,
  AwardAction.Player,
]);

export class AwardButtonHandler extends InteractionHandler {
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
    const parsed = AwardCustomIds.parse(interaction.customId);

    if (!parsed || !BUTTON_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ButtonInteraction,
    result: {
      action: AwardAction;
      args: string[];
    },
  ) {
    try {
      switch (result.action) {
        case AwardAction.Create:
          await interaction.showModal(AwardComponents.createModal());
          return;

        case AwardAction.Player:
          await interaction.showModal(
            ManageComponents.memberSearchModal(
              AwardCustomIds.build(AwardAction.PlayerSearch),
              "Награды игрока",
            ),
          );
          return;
      }

      await AwardService.assertCanManage(interaction);

      if (result.action === AwardAction.Delete) {
        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [
            AwardContainer.selectToDelete(await AwardService.getAwards()),
          ],
        });

        return;
      }

      if (result.action === AwardAction.DeleteConfirm) {
        const award = await AwardService.deleteAward(result.args[0]);

        await interaction.update({
          flags: MessageFlags.IsComponentsV2,
          components: [
            AwardContainer.result(
              "Награда удалена",
              `${award.emoji} **${award.label}** удалена.`,
            ),
          ],
        });

        return;
      }

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [AwardContainer.root(await AwardService.getAwards())],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }
}
