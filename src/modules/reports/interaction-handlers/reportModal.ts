import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, type ModalSubmitInteraction } from "discord.js";

import { ReportContainer } from "../lib/reportContainer.js";
import { ReportAction, ReportCustomIds, ReportModalFields } from "../lib/reportCustomIds.js";
import { ReportResponder } from "../lib/reportResponder.js";
import { ReportService } from "../service/reportService.js";
import { ReportError } from "../types/report.js";

type ReportTarget = {
  channelId: string | null;
  messageId: string | null;
};

export class ReportModalHandler extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
    });
  }

  public override parse(interaction: ModalSubmitInteraction) {
    const parsed = ReportCustomIds.parse(interaction.customId);

    if (parsed?.action !== ReportAction.Submit) {
      return this.none();
    }

    return this.some<ReportTarget>({
      channelId: parsed.args[0] ?? null,
      messageId: parsed.args[1] ?? null,
    });
  }

  public override async run(interaction: ModalSubmitInteraction, context: ReportTarget) {
    try {
      if (!interaction.inCachedGuild()) {
        throw new ReportError("Жалобы можно отправлять только на сервере.");
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const target = interaction.fields.getSelectedUsers(ReportModalFields.Target)?.first();

      if (!target) {
        throw new ReportError("Выберите участника, на которого жалуетесь.");
      }

      const reason = interaction.fields.getTextInputValue(ReportModalFields.Reason).trim() || null;
      const description = interaction.fields.getTextInputValue(ReportModalFields.Description).trim();
      const images = [...(interaction.fields.getUploadedFiles(ReportModalFields.Images)?.values() ?? [])];

      await ReportService.submit({
        guild: interaction.guild,
        reporter: interaction.user,
        target,
        reason,
        description,
        channelId: context.channelId,
        messageId: context.messageId,
        images,
      });

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          ReportContainer.success(
            `Жалоба на <@${target.id}> отправлена администрации. Когда её рассмотрят, бот напишет вам в личные сообщения.`,
          ),
        ],
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      await ReportResponder.error(interaction, error);
    }
  }
}
