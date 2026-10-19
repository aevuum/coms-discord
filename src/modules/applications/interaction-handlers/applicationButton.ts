import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, type ButtonInteraction } from "discord.js";

import { ApplicationContainer } from "../lib/applicationContainer.js";
import { ApplicationAction, ApplicationCustomIds } from "../lib/applicationCustomIds.js";
import { ApplicationModal } from "../lib/applicationModal.js";
import { ApplicationResponder } from "../lib/applicationResponder.js";
import { ApplicationRepository } from "../repositories/applicationRepository.js";
import { ApplicationService } from "../service/applicationService.js";
import { ApplicationError } from "../types/application.js";

const ACTIONS = [
  ApplicationAction.Next,
  ApplicationAction.Post,
  ApplicationAction.Accept,
  ApplicationAction.Reject,
];

type ApplicationButton = {
  action: ApplicationAction;
  applicationId: string;
  part: number;
};

export class ApplicationButtonHandler extends InteractionHandler {
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
    const parsed = ApplicationCustomIds.parse(interaction.customId);

    if (!parsed || !ACTIONS.includes(parsed.action) || !parsed.args[0]) {
      return this.none();
    }

    return this.some<ApplicationButton>({
      action: parsed.action,
      applicationId: parsed.args[0],
      part: Number(parsed.args[1]) || 0,
    });
  }

  public override async run(interaction: ButtonInteraction, result: ApplicationButton) {
    try {
      switch (result.action) {
        case ApplicationAction.Next:
          return await this.next(interaction, result);

        case ApplicationAction.Post:
          return await this.post(interaction, result.applicationId);

        case ApplicationAction.Accept:
          return await this.accept(interaction, result.applicationId);

        case ApplicationAction.Reject:
          return await this.reject(interaction, result.applicationId);
      }
    } catch (error) {
      await ApplicationResponder.error(interaction, error);
    }
  }

  private async next(interaction: ButtonInteraction, result: ApplicationButton) {
    const application = await ApplicationService.loadDraft(interaction.user.id, result.applicationId);

    await interaction.showModal(
      ApplicationModal.part(
        ApplicationCustomIds.build(ApplicationAction.Part, application.id, result.part),
        application.roleName,
        ApplicationService.questions(application),
        result.part,
      ),
    );
  }

  private async post(interaction: ButtonInteraction, applicationId: string) {
    const application = await ApplicationRepository.findById(applicationId);

    if (!application || application.userId !== interaction.user.id) {
      throw new ApplicationError("Заявка не найдена.");
    }

    if (application.status !== "AWAITING_POST") {
      throw new ApplicationError("Пробный пост для этой заявки уже получен.");
    }

    await interaction.showModal(ApplicationModal.trialPost(application.id));
  }

  private async accept(interaction: ButtonInteraction, applicationId: string) {
    if (!interaction.inCachedGuild()) {
      throw new ApplicationError("Заявки работают только на сервере.");
    }

    await ApplicationService.assertCanDecide(interaction.member, applicationId);

    await interaction.deferUpdate();

    const { application, roleGranted, notified } = await ApplicationService.decide(
      interaction.member,
      applicationId,
      true,
      null,
    );

    await interaction.editReply({
      flags: MessageFlags.IsComponentsV2,
      components: [await ApplicationService.render(application)],
      allowedMentions: { parse: [] },
    });

    const notes = [
      application.roleId
        ? roleGranted
          ? `Роль <@&${application.roleId}> выдана.`
          : `Не удалось выдать роль <@&${application.roleId}>: проверьте, что роль бота выше неё.`
        : "Роль для этой должности не найдена, выдайте её вручную.",
      notified ? null : "Кандидату не удалось написать в личные сообщения.",
    ].filter((note) => note !== null);

    await interaction.followUp({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [ApplicationContainer.success(`Заявка принята. ${notes.join(" ")}`)],
      allowedMentions: { parse: [] },
    });
  }

  private async reject(interaction: ButtonInteraction, applicationId: string) {
    if (!interaction.inCachedGuild()) {
      throw new ApplicationError("Заявки работают только на сервере.");
    }

    await ApplicationService.assertCanDecide(interaction.member, applicationId);

    await interaction.showModal(ApplicationModal.rejectReason(applicationId));
  }
}
