import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import {
  MessageFlags,
  type Client,
  type ModalSubmitInteraction,
} from "discord.js";

import type { StaffApplication } from "../../../database/generated/prisma/client.js";

import { ApplicationContainer } from "../lib/applicationContainer.js";
import {
  ApplicationAction,
  ApplicationCustomIds,
  ApplicationModalFields,
} from "../lib/applicationCustomIds.js";
import { ApplicationModal } from "../lib/applicationModal.js";
import { ApplicationResponder } from "../lib/applicationResponder.js";
import { ApplicationService } from "../service/applicationService.js";
import { ApplicationError } from "../types/application.js";

const ACTIONS = [
  ApplicationAction.First,
  ApplicationAction.Part,
  ApplicationAction.PostModal,
  ApplicationAction.RejectModal,
];

type ApplicationModalResult = {
  action: ApplicationAction;
  args: string[];
};

export class ApplicationModalHandler extends InteractionHandler {
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
    const parsed = ApplicationCustomIds.parse(interaction.customId);

    if (!parsed || !ACTIONS.includes(parsed.action) || !parsed.args[0]) {
      return this.none();
    }

    return this.some<ApplicationModalResult>(parsed);
  }

  public override async run(interaction: ModalSubmitInteraction, result: ApplicationModalResult) {
    try {
      switch (result.action) {
        case ApplicationAction.First:
          return await this.first(interaction, result.args[0]);

        case ApplicationAction.Part:
          return await this.part(interaction, result.args[0], Number(result.args[1]) || 0);

        case ApplicationAction.PostModal:
          return await this.trialPost(interaction, result.args[0]);

        case ApplicationAction.RejectModal:
          return await this.reject(interaction, result.args[0]);
      }
    } catch (error) {
      await ApplicationResponder.error(interaction, error);
    }
  }

  private async first(interaction: ModalSubmitInteraction, tagId: string) {
    if (!interaction.inCachedGuild()) {
      throw new ApplicationError("Заявки работают только на сервере.");
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const application = await ApplicationService.saveFirstPart(
      interaction.member,
      tagId,
      (index) => this.read(interaction, index),
    );

    await this.advance(interaction, application, 0);
  }

  private async part(interaction: ModalSubmitInteraction, applicationId: string, part: number) {
    if (interaction.isFromMessage()) {
      await interaction.deferUpdate();
    } else {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    const application = await ApplicationService.savePart(
      interaction.user.id,
      applicationId,
      part,
      (index) => this.read(interaction, index),
    );

    await this.advance(interaction, application, part);
  }

  private async advance(interaction: ModalSubmitInteraction, application: StaffApplication, part: number) {
    if (!ApplicationService.isLastPart(application, part)) {
      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          ApplicationContainer.partSaved(
            application.id,
            part + 1,
            ApplicationModal.totalParts(ApplicationService.questions(application)),
          ),
        ],
      });

      return;
    }

    const { awaitingPost, dmSent, application: completed } = await ApplicationService.complete(
      interaction.client as Client,
      application,
    );

    if (!awaitingPost) {
      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [
          ApplicationContainer.success(
            `Заявка на должность «${completed.roleName}» отправлена. Решение придёт вам в личные сообщения.`,
          ),
        ],
      });

      return;
    }

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        dmSent
          ? ApplicationContainer.success(
              "Анкета сохранена. Последний шаг — пробный пост: задание уже в ваших личных сообщениях.",
            )
          : ApplicationContainer.trialRequest(completed),
      ],
    });
  }

  private async trialPost(interaction: ModalSubmitInteraction, applicationId: string) {
    if (interaction.isFromMessage()) {
      await interaction.deferUpdate();
    } else {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    }

    await ApplicationService.submitTrialPost(
      interaction.client,
      interaction.user.id,
      applicationId,
      interaction.fields.getTextInputValue(ApplicationModalFields.TrialPost),
    );

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [
        ApplicationContainer.success(
          "Пробный пост получен, заявка отправлена на рассмотрение. Решение придёт вам в личные сообщения.",
        ),
      ],
    });
  }

  private async reject(interaction: ModalSubmitInteraction, applicationId: string) {
    if (!interaction.inCachedGuild() || !interaction.isFromMessage()) {
      throw new ApplicationError("Заявки работают только на сервере.");
    }

    await interaction.deferUpdate();

    const reason =
      interaction.fields.getTextInputValue(ApplicationModalFields.RejectReason).trim() || null;

    const { application, notified } = await ApplicationService.decide(
      interaction.member,
      applicationId,
      false,
      reason,
    );

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [await ApplicationService.render(application)],
      allowedMentions: { parse: [] },
    });

    await interaction.followUp({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [
        ApplicationContainer.success(
          `Заявка отклонена.${notified ? "" : " Кандидату не удалось написать в личные сообщения."}`,
        ),
      ],
    });
  }

  private read(interaction: ModalSubmitInteraction, index: number) {
    try {
      return interaction.fields.getTextInputValue(ApplicationCustomIds.question(index));
    } catch {
      return null;
    }
  }
}
