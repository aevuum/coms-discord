import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, type ButtonInteraction } from "discord.js";

import { ManageComponents } from "../../manage/lib/manageComponents.js";
import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { LocationAdminContainer } from "../lib/locationAdminContainer.js";
import { LocationAdminViews } from "../lib/locationAdminViews.js";
import { LocationAdminAction, LocationCustomIds } from "../lib/locationCustomIds.js";
import { LocationService } from "../service/locationService.js";
import { LocationError } from "../types/locations.js";

const BUTTON_ACTIONS = new Set<LocationAdminAction>([
  LocationAdminAction.Root,
  LocationAdminAction.View,
  LocationAdminAction.Add,
  LocationAdminAction.AddRolePage,
  LocationAdminAction.Edit,
  LocationAdminAction.ToggleAccess,
  LocationAdminAction.ArrivalPage,
  LocationAdminAction.ArrivalClear,
  LocationAdminAction.RouteAdd,
  LocationAdminAction.RouteDelete,
  LocationAdminAction.Delete,
  LocationAdminAction.DeleteConfirm,
  LocationAdminAction.Settings,
  LocationAdminAction.SettingsPage,
  LocationAdminAction.SettingsClear,
  LocationAdminAction.Move,
]);

export class LocationAdminButtonHandler extends InteractionHandler {
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
    const parsed = LocationCustomIds.parse(interaction.customId);

    if (!parsed || !BUTTON_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(
    interaction: ButtonInteraction,
    result: { action: LocationAdminAction; args: string[] },
  ) {
    try {
      if (result.action === LocationAdminAction.Move) {
        await interaction.showModal(
          ManageComponents.memberSearchModal(
            LocationCustomIds.build(LocationAdminAction.MoveSearch),
            "Переместить игрока",
          ),
        );

        return;
      }

      if (result.action === LocationAdminAction.Edit) {
        await this.showEditModal(interaction, result.args[0]);
        return;
      }

      await interaction.deferUpdate();

      const guildId = await LocationService.assertCanManage(interaction);

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [await this.resolve(interaction, guildId, result)],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }

  private async showEditModal(interaction: ButtonInteraction, id: string) {
    const location = await LocationService.get(process.env.GUILD_ID ?? "", id);

    await interaction.showModal(
      LocationAdminContainer.locationModal(
        LocationCustomIds.build(LocationAdminAction.EditModal, id),
        `Изменить · ${location.name}`,
        {
          name: location.name,
          emoji: location.emoji ?? "",
          description: location.description ?? "",
        },
      ),
    );
  }

  private async resolve(
    interaction: ButtonInteraction,
    guildId: string,
    result: { action: LocationAdminAction; args: string[] },
  ) {
    const { client } = interaction;
    const [id, extra] = result.args;

    switch (result.action) {
      case LocationAdminAction.View:
        return LocationAdminViews.view(client, guildId, id);

      case LocationAdminAction.Add:
      case LocationAdminAction.AddRolePage:
        return LocationAdminViews.addRole(guildId, Number(id) || 0);

      case LocationAdminAction.ToggleAccess:
        await LocationService.toggleAccess(guildId, id);
        return LocationAdminViews.view(client, guildId, id);

      case LocationAdminAction.ArrivalPage:
        return LocationAdminViews.arrival(client, guildId, id, Number(extra) || 0);

      case LocationAdminAction.ArrivalClear:
        await LocationService.setArrivalChannel(guildId, id, null);
        return LocationAdminViews.view(client, guildId, id);

      case LocationAdminAction.RouteAdd: {
        const location = await LocationService.get(guildId, id);
        return LocationAdminContainer.routeTargets(location, await LocationService.list(guildId));
      }

      case LocationAdminAction.RouteDelete: {
        const location = await LocationService.get(guildId, id);

        if (!location.routesFrom.length) {
          throw new LocationError("Из этой локации не ведёт ни одного пути.");
        }

        return LocationAdminContainer.routeDeletePicker(location);
      }

      case LocationAdminAction.Delete:
        return LocationAdminContainer.deleteConfirm(await LocationService.get(guildId, id));

      case LocationAdminAction.DeleteConfirm:
        await LocationService.delete(guildId, id);
        return LocationAdminViews.root(client, guildId);

      case LocationAdminAction.Settings:
        return LocationAdminViews.settings(client, guildId);

      case LocationAdminAction.SettingsPage:
        if (!LocationAdminViews.isSettingsField(id)) {
          throw new LocationError("Неизвестная настройка.");
        }

        return LocationAdminViews.settingsPicker(client, guildId, id, Number(extra) || 0);

      case LocationAdminAction.SettingsClear:
        if (!LocationAdminViews.isSettingsField(id)) {
          throw new LocationError("Неизвестная настройка.");
        }

        await LocationService.setSetting(client, guildId, id, null);
        return LocationAdminViews.settings(client, guildId);

      default:
        return LocationAdminViews.root(client, guildId);
    }
  }
}
