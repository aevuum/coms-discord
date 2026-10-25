import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, StringSelectMenuInteraction } from "discord.js";

import { LessonCard } from "../lib/lessonCard.js";
import { LessonCardAction, ScheduleCustomIds } from "../lib/scheduleCustomIds.js";
import { ScheduleResponder } from "../lib/scheduleResponder.js";
import { EnrollmentService } from "../service/enrollmentService.js";

export class LessonCardSelectHandler extends InteractionHandler {
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
    const parsed = ScheduleCustomIds.parseCard(interaction.customId);

    return parsed?.action === LessonCardAction.Pick && parsed.args[0]
      ? this.some({ lessonId: parsed.args[0], characterId: interaction.values[0] })
      : this.none();
  }

  public override async run(interaction: StringSelectMenuInteraction, result: { lessonId: string; characterId: string }) {
    try {
      await interaction.deferUpdate();

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [LessonCard.success(await EnrollmentService.enroll(interaction.user.id, result.lessonId, result.characterId))],
      });
    } catch (error) {
      await ScheduleResponder.error(interaction, error);
    }
  }
}
