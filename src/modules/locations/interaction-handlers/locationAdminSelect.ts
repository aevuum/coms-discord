import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, type StringSelectMenuInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { LocationAdminContainer } from "../lib/locationAdminContainer.js";
import { LocationAdminViews } from "../lib/locationAdminViews.js";
import { LocationAdminAction, LocationCustomIds } from "../lib/locationCustomIds.js";
import { LocationFormatter } from "../lib/locationFormatter.js";
import { LocationService } from "../service/locationService.js";
import { TravelService } from "../service/travelService.js";
import { LocationError } from "../types/locations.js";

const SELECT_ACTIONS = new Set<LocationAdminAction>([
  LocationAdminAction.View,
  LocationAdminAction.AddRole,
  LocationAdminAction.Arrival,
  LocationAdminAction.RouteTarget,
  LocationAdminAction.RouteRemove,
  LocationAdminAction.SettingsPick,
  LocationAdminAction.SettingsSet,
  LocationAdminAction.MoveMember,
  LocationAdminAction.MoveTarget,
]);

export class LocationAdminSelectHandler extends InteractionHandler {
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
    const parsed = LocationCustomIds.parse(interaction.customId);

    if (!parsed || !SELECT_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some({ ...parsed, value: interaction.values[0] });
  }

  public override async run(
    interaction: StringSelectMenuInteraction,
    result: { action: LocationAdminAction; args: string[]; value: string },
  ) {
    try {
      if (result.action === LocationAdminAction.AddRole) {
        const role = TravelService.getGuild(interaction.client).roles.cache.get(result.value);

        await interaction.showModal(
          LocationAdminContainer.locationModal(
            LocationCustomIds.build(LocationAdminAction.CreateModal, result.value),
            "Новая локация",
            {
              name: role ? LocationService.cleanRoleName(role.name) : "",
              emoji: "",
              description: "",
            },
          ),
        );

        return;
      }

      if (result.action === LocationAdminAction.RouteTarget) {
        const guildId = process.env.GUILD_ID ?? "";

        const [from, to] = await Promise.all([
          LocationService.get(guildId, result.args[0]),
          LocationService.get(guildId, result.value),
        ]);

        await interaction.showModal(LocationAdminContainer.routeModal(from, to));

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

  private async resolve(
    interaction: StringSelectMenuInteraction,
    guildId: string,
    result: { action: LocationAdminAction; args: string[]; value: string },
  ) {
    const { client } = interaction;
    const [arg] = result.args;

    switch (result.action) {
      case LocationAdminAction.Arrival:
        await LocationService.setArrivalChannel(guildId, arg, result.value);
        return LocationAdminViews.view(client, guildId, arg);

      case LocationAdminAction.RouteRemove:
        await LocationService.deleteRoute(guildId, arg, result.value);
        return LocationAdminViews.view(client, guildId, arg);

      case LocationAdminAction.SettingsPick:
        if (!LocationAdminViews.isSettingsField(result.value)) {
          throw new LocationError("Неизвестная настройка.");
        }

        return LocationAdminViews.settingsPicker(client, guildId, result.value, 0);

      case LocationAdminAction.SettingsSet:
        if (!LocationAdminViews.isSettingsField(arg)) {
          throw new LocationError("Неизвестная настройка.");
        }

        await LocationService.setSetting(client, guildId, arg, result.value);
        return LocationAdminViews.settings(client, guildId);

      case LocationAdminAction.MoveMember:
        return LocationAdminViews.moveTargets(client, guildId, result.value);

      case LocationAdminAction.MoveTarget: {
        const moved = await TravelService.moveByCurator(
          TravelService.getGuild(client),
          arg,
          result.value,
          interaction.user.id,
        );

        return LocationAdminContainer.result(
          "Перемещение игрока",
          `**${moved.member.displayName}** теперь находится: **${LocationFormatter.title(moved.location)}**.`,
        );
      }

      default:
        return LocationAdminViews.view(client, guildId, result.value);
    }
  }
}
