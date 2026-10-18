import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import type { ModalSubmitInteraction } from "discord.js";

import { MEMBER_QUERY_FIELD } from "../../manage/lib/manageCustomIds.js";
import { ManageContainer } from "../../manage/lib/manageContainer.js";
import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { MemberSearchService } from "../../manage/service/memberSearchService.js";
import { LocationAdminViews } from "../lib/locationAdminViews.js";
import {
  LocationAdminAction,
  LocationCustomIds,
  LocationModalFields,
} from "../lib/locationCustomIds.js";
import { LocationService } from "../service/locationService.js";

const MODAL_ACTIONS = new Set<LocationAdminAction>([
  LocationAdminAction.CreateModal,
  LocationAdminAction.EditModal,
  LocationAdminAction.RouteModal,
  LocationAdminAction.MoveSearch,
]);

export class LocationAdminModalHandler extends InteractionHandler {
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
    const parsed = LocationCustomIds.parse(interaction.customId);

    if (!parsed || !MODAL_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ModalSubmitInteraction,
    result: { action: LocationAdminAction; args: string[] },
  ) {
    try {
      await ManageResponder.defer(interaction);

      const guildId = await LocationService.assertCanManage(interaction);

      await ManageResponder.send(interaction, await this.resolve(interaction, guildId, result));
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }

  private async resolve(
    interaction: ModalSubmitInteraction,
    guildId: string,
    result: { action: LocationAdminAction; args: string[] },
  ) {
    const { client, fields } = interaction;
    const text = (id: string) => fields.getTextInputValue(id) ?? "";

    switch (result.action) {
      case LocationAdminAction.CreateModal: {
        const location = await LocationService.create(
          client,
          guildId,
          result.args[0],
          text(LocationModalFields.Name),
          text(LocationModalFields.Emoji),
          text(LocationModalFields.Description),
        );

        return LocationAdminViews.view(client, guildId, location.id);
      }

      case LocationAdminAction.EditModal:
        await LocationService.edit(
          client,
          guildId,
          result.args[0],
          text(LocationModalFields.Name),
          text(LocationModalFields.Emoji),
          text(LocationModalFields.Description),
        );

        return LocationAdminViews.view(client, guildId, result.args[0]);

      case LocationAdminAction.RouteModal: {
        const options = fields.getStringSelectValues(LocationModalFields.Options);

        await LocationService.addRoute(guildId, result.args[0], result.args[1], {
          method: text(LocationModalFields.Method),
          minutes: text(LocationModalFields.Minutes),
          itemName: text(LocationModalFields.ItemName),
          itemQuantity: text(LocationModalFields.ItemQuantity),
          adultOnly: options.includes("adult"),
          reverse: options.includes("reverse"),
        });

        return LocationAdminViews.view(client, guildId, result.args[0]);
      }

      default: {
        const query = text(MEMBER_QUERY_FIELD);

        return ManageContainer.memberResults(
          "Переместить игрока",
          query,
          await MemberSearchService.search(query),
          LocationCustomIds.build(LocationAdminAction.MoveMember),
          LocationCustomIds.build(LocationAdminAction.Move),
        );
      }
    }
  }
}
