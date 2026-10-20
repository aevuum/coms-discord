import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { MessageFlags, type ButtonInteraction, type Client } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { ApplicationAdminContainer } from "../lib/applicationAdminContainer.js";
import { ApplicationAdminAction, ApplicationAdminCustomIds } from "../lib/applicationAdminCustomIds.js";
import { ApplicationAdminViews } from "../lib/applicationAdminViews.js";
import { ApplicationAdminService } from "../service/applicationAdminService.js";
import { ApplicationTemplates } from "../service/applicationTemplates.js";

const BUTTON_ACTIONS = new Set<ApplicationAdminAction>([
  ApplicationAdminAction.Root,
  ApplicationAdminAction.Role,
  ApplicationAdminAction.Toggle,
  ApplicationAdminAction.Add,
  ApplicationAdminAction.Edit,
  ApplicationAdminAction.Up,
  ApplicationAdminAction.Down,
  ApplicationAdminAction.Delete,
  ApplicationAdminAction.Reset,
  ApplicationAdminAction.RolePage,
  ApplicationAdminAction.RoleAuto,
]);

type AdminButton = {
  action: ApplicationAdminAction;
  args: string[];
};

export class ApplicationAdminButtonHandler extends InteractionHandler {
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
    const parsed = ApplicationAdminCustomIds.parse(interaction.customId);

    if (!parsed || !BUTTON_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some<AdminButton>(parsed);
  }

  public override async run(interaction: ButtonInteraction, result: AdminButton) {
    const [tagId, rawIndex] = result.args;
    const index = Number(rawIndex);

    try {
      if (result.action === ApplicationAdminAction.Add) {
        await ApplicationAdminService.assertCanManage(interaction);

        const role = await ApplicationTemplates.getRole(interaction.client, tagId);

        await interaction.showModal(ApplicationAdminContainer.modal(role.name, tagId));
        return;
      }

      if (result.action === ApplicationAdminAction.Edit) {
        await ApplicationAdminService.assertCanManage(interaction);

        const { role, question } = await ApplicationAdminService.getQuestion(interaction.client, tagId, index);

        await interaction.showModal(ApplicationAdminContainer.modal(role.name, tagId, question, index));
        return;
      }

      await interaction.deferUpdate();

      await ApplicationAdminService.assertCanManage(interaction);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [await this.resolve(interaction.client, result.action, tagId, index)],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }

  private async resolve(client: Client<true>, action: ApplicationAdminAction, tagId: string, index: number) {
    switch (action) {
      case ApplicationAdminAction.Toggle:
        await ApplicationAdminService.toggle(client, tagId);
        return ApplicationAdminViews.role(client, tagId);

      case ApplicationAdminAction.Up:
        return ApplicationAdminViews.question(
          client,
          tagId,
          await ApplicationAdminService.move(client, tagId, index, -1),
        );

      case ApplicationAdminAction.Down:
        return ApplicationAdminViews.question(
          client,
          tagId,
          await ApplicationAdminService.move(client, tagId, index, 1),
        );

      case ApplicationAdminAction.Delete:
        await ApplicationAdminService.remove(client, tagId, index);
        return ApplicationAdminViews.role(client, tagId);

      case ApplicationAdminAction.Reset:
        await ApplicationAdminService.reset(tagId);
        return ApplicationAdminViews.role(client, tagId);

      case ApplicationAdminAction.Role:
        return ApplicationAdminViews.role(client, tagId);

      case ApplicationAdminAction.RolePage:
        return ApplicationAdminViews.rolePicker(client, tagId, Number.isInteger(index) ? index : 0);

      case ApplicationAdminAction.RoleAuto:
        await ApplicationAdminService.setRole(client, tagId, null);
        return ApplicationAdminViews.role(client, tagId);

      default:
        return ApplicationAdminViews.root(client);
    }
  }
}
