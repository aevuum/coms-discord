import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, type ButtonInteraction, type StringSelectMenuInteraction } from "discord.js";

import { PermissionService } from "../../permissions/service/permissionService.js";
import { ScheduleResponder } from "../lib/scheduleResponder.js";
import { TimetableAction, TimetableView } from "../lib/timetableView.js";
import { ScheduleError } from "../types/schedule.js";

export class TimetableComponentHandler extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.MessageComponent,
    });
  }

  public override parse(interaction: ButtonInteraction | StringSelectMenuInteraction) {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) {
      return this.none();
    }

    const parsed = TimetableView.parse(interaction.customId);

    return parsed ? this.some(parsed) : this.none();
  }

  public override async run(
    interaction: ButtonInteraction | StringSelectMenuInteraction,
    result: { action: TimetableAction; args: string[] },
  ) {
    try {
      const ephemeral = interaction.message.flags.has(MessageFlags.Ephemeral);
      const own = ephemeral || interaction.message.interactionMetadata?.user.id === interaction.user.id;
      const fresh = !own || result.args[0] === "self";

      if (fresh) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      } else {
        await interaction.deferUpdate();
      }

      const subject = await PermissionService.resolveSubject(interaction);

      if (!subject.guildId) {
        throw new ScheduleError("Вы не состоите на сервере бота.");
      }

      const [characterId, offset] =
        result.action === TimetableAction.Character && interaction.isStringSelectMenu()
          ? [own ? interaction.values[0] : null, Number(result.args[0])]
          : [own && result.args[0] !== "self" ? result.args[0] : null, own ? Number(result.args[1]) : 0];

      const view = await TimetableView.open(interaction.user.id, subject.guildId, characterId, offset);

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
