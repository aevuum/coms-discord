import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags } from "discord.js";

import { LessonCard } from "../lib/lessonCard.js";
import { LessonCardAction, ScheduleCustomIds } from "../lib/scheduleCustomIds.js";
import { ScheduleResponder } from "../lib/scheduleResponder.js";
import { EnrollmentService } from "../service/enrollmentService.js";

export class LessonCardButtonHandler extends InteractionHandler {
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
    const parsed = ScheduleCustomIds.parseCard(interaction.customId);

    return parsed && parsed.action !== LessonCardAction.Pick && parsed.args[0] ? this.some(parsed) : this.none();
  }

  public override async run(interaction: ButtonInteraction, result: { action: LessonCardAction; args: string[] }) {
    const [lessonId] = result.args;

    try {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      if (result.action === LessonCardAction.Leave) {
        await interaction.editReply({
          flags: MessageFlags.IsComponentsV2,
          components: [LessonCard.success(await EnrollmentService.leave(interaction.user.id, lessonId))],
        });
        return;
      }

      const { message, characters } = await EnrollmentService.start(interaction.user.id, lessonId);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [message ? LessonCard.success(message) : LessonCard.characterPicker(lessonId, characters ?? [])],
      });
    } catch (error) {
      await ScheduleResponder.error(interaction, error);
    }
  }
}
