import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, StringSelectMenuInteraction } from "discord.js";

import { ScheduleAdminViews } from "../lib/scheduleAdminViews.js";
import { ScheduleAdminAction, ScheduleCustomIds } from "../lib/scheduleCustomIds.js";
import { ScheduleResponder } from "../lib/scheduleResponder.js";
import { LessonService } from "../service/lessonService.js";

const SELECT_ACTIONS = new Set<ScheduleAdminAction>([ScheduleAdminAction.Open, ScheduleAdminAction.SubjectOpen]);

export class ScheduleAdminSelectHandler extends InteractionHandler {
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
    const parsed = ScheduleCustomIds.parseAdmin(interaction.customId);

    return parsed && SELECT_ACTIONS.has(parsed.action) ? this.some({ action: parsed.action, value: interaction.values[0] }) : this.none();
  }

  public override async run(interaction: StringSelectMenuInteraction, result: { action: ScheduleAdminAction; value: string }) {
    try {
      await interaction.deferUpdate();
      await LessonService.assertAdmin(interaction);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          result.action === ScheduleAdminAction.Open
            ? await ScheduleAdminViews.lesson(result.value)
            : await ScheduleAdminViews.subject(result.value),
        ],
      });
    } catch (error) {
      await ScheduleResponder.error(interaction, error);
    }
  }
}
