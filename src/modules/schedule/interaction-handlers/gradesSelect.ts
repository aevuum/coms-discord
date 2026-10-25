import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, StringSelectMenuInteraction } from "discord.js";

import { GradesView } from "../lib/gradesView.js";
import { GradesAction, ScheduleCustomIds } from "../lib/scheduleCustomIds.js";
import { ScheduleResponder } from "../lib/scheduleResponder.js";

export class GradesSelectHandler extends InteractionHandler {
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
    const parsed = ScheduleCustomIds.parseGrades(interaction.customId);

    return parsed && parsed.args.length === 4 ? this.some({ ...parsed, value: interaction.values[0] }) : this.none();
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    result: { action: GradesAction; args: string[]; value: string },
  ) {
    const [ownerId, characterId, subject, month] = result.args;

    try {
      const ephemeral = interaction.message.flags.has(MessageFlags.Ephemeral);
      const own = ephemeral || interaction.message.interactionMetadata?.user.id === interaction.user.id;

      if (own) {
        await interaction.deferUpdate();
      } else {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }

      const view = own
        ? await GradesView.open(
            interaction,
            ownerId,
            result.action === GradesAction.Character ? result.value : characterId,
            result.action === GradesAction.Subject ? result.value : subject,
            result.action === GradesAction.Month ? result.value : month,
          )
        : await GradesView.open(interaction, interaction.user.id, null);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: view.components,
        files: view.files,
        attachments: [],
      });
    } catch (error) {
      await ScheduleResponder.error(interaction, error);
    }
  }
}
