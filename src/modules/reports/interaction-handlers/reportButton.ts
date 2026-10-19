import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, type ButtonInteraction } from "discord.js";

import { ReportAction, ReportCustomIds } from "../lib/reportCustomIds.js";
import { ReportResponder } from "../lib/reportResponder.js";
import { ReportService } from "../service/reportService.js";
import { ReportError } from "../types/report.js";

type ReportButton = {
  action: ReportAction;
  reportId: string;
};

export class ReportButtonHandler extends InteractionHandler {
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
    const parsed = ReportCustomIds.parse(interaction.customId);

    if (!parsed || parsed.action === ReportAction.Submit || !parsed.args[0]) {
      return this.none();
    }

    return this.some<ReportButton>({ action: parsed.action, reportId: parsed.args[0] });
  }

  public override async run(interaction: ButtonInteraction, result: ReportButton) {
    try {
      if (!interaction.inCachedGuild()) {
        throw new ReportError("Жалобы работают только на сервере.");
      }

      const report =
        result.action === ReportAction.Take
          ? await ReportService.take(result.reportId, interaction.user.id)
          : await ReportService.close(
              result.reportId,
              interaction.user.id,
              result.action === ReportAction.Resolve ? "RESOLVED" : "REJECTED",
            );

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [await ReportService.render(report)],
        allowedMentions: { parse: [] },
      });

      if (report.status === "RESOLVED" || report.status === "REJECTED") {
        await ReportService.notifyReporter(interaction.guild, report);
      }
    } catch (error) {
      await ReportResponder.error(interaction, error);
    }
  }
}
