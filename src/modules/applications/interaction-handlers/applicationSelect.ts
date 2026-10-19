import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, type StringSelectMenuInteraction } from "discord.js";

import { ApplicationContainer } from "../lib/applicationContainer.js";
import { ApplicationAction, ApplicationCustomIds } from "../lib/applicationCustomIds.js";
import { ApplicationModal } from "../lib/applicationModal.js";
import { ApplicationResponder } from "../lib/applicationResponder.js";
import { ApplicationService } from "../service/applicationService.js";
import { ApplicationError } from "../types/application.js";

type ApplicationSelect = {
  action: ApplicationAction.Open | ApplicationAction.Rate;
  applicationId: string | null;
};

export class ApplicationSelectHandler extends InteractionHandler {
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
    const parsed = ApplicationCustomIds.parse(interaction.customId);

    if (parsed?.action !== ApplicationAction.Open && parsed?.action !== ApplicationAction.Rate) {
      return this.none();
    }

    return this.some<ApplicationSelect>({
      action: parsed.action,
      applicationId: parsed.args[0] ?? null,
    });
  }

  public override async run(interaction: StringSelectMenuInteraction, result: ApplicationSelect) {
    try {
      if (!interaction.inCachedGuild()) {
        throw new ApplicationError("Заявки работают только на сервере.");
      }

      if (result.action === ApplicationAction.Open) {
        return await this.open(interaction);
      }

      return await this.rate(interaction, result.applicationId!);
    } catch (error) {
      await ApplicationResponder.error(interaction, error);
    }
  }

  private async open(interaction: StringSelectMenuInteraction<"cached">) {
    const tagId = interaction.values[0];

    const { role, questions } = await ApplicationService.prepare(interaction.member, tagId);

    await interaction.showModal(
      ApplicationModal.part(
        ApplicationCustomIds.build(ApplicationAction.First, tagId),
        role.name,
        questions,
        0,
      ),
    );
  }

  private async rate(interaction: StringSelectMenuInteraction<"cached">, applicationId: string) {
    const stars = Number(interaction.values[0]);

    const application = await ApplicationService.rate(interaction.member, applicationId, stars);

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [await ApplicationService.render(application)],
      allowedMentions: { parse: [] },
    });

    await interaction.followUp({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [ApplicationContainer.success(`Ваша оценка: ${ApplicationContainer.stars(stars)}`)],
    });
  }
}
