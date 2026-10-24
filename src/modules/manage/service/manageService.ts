import type { BaseInteraction, ContainerBuilder } from "discord.js";

import { AwardContainer } from "../../award/lib/awardContainer.js";
import { AwardService } from "../../award/service/awardService.js";
import { ManageCharacterContainer } from "../../character/lib/manageCharacterContainer.js";
import { PermissionContainer } from "../../permissions/lib/permissionContainer.js";
import { PermissionService } from "../../permissions/service/permissionService.js";
import { SpellContainer } from "../../spells/lib/spellContainer.js";
import { SpellService } from "../../spells/service/spellService.js";
import { SpellMode } from "../../spells/types/spells.js";
import { CoinsAdminContainer } from "../../coins/lib/coinsAdminContainer.js";
import { StipendService } from "../../coins/service/stipendService.js";
import { ShopAdminContainer } from "../../shop/lib/shopAdminContainer.js";
import { ShopService } from "../../shop/service/shopService.js";
import { LocationAdminViews } from "../../locations/lib/locationAdminViews.js";
import { RollAdminViews } from "../../rolls/lib/rollAdminViews.js";
import { ApplicationAdminViews } from "../../applications/lib/applicationAdminViews.js";
import { GiveawayAdminViews } from "../../giveaways/lib/giveawayAdminViews.js";
import { PingRoleAdminViews } from "../../roles/lib/pingRoleAdminViews.js";
import { ReportAdminContainer } from "../../reports/lib/reportAdminContainer.js";
import { ReportReviewers } from "../../reports/service/reportReviewers.js";
import { RuneAdminViews } from "../../runes/lib/runeAdminViews.js";
import { ManageContainer } from "../lib/manageContainer.js";
import { ManageError } from "../lib/manageResponder.js";
import { getManageSection } from "../lib/manageSections.js";
import { ManageSectionId } from "../types/manage.js";

export class ManageService {
  public static async getHub(interaction: BaseInteraction) {
    const subject = await PermissionService.resolveSubject(interaction);

    if (!subject.guildId) {
      throw new ManageError(
        "Вы не состоите на сервере бота или сервер не настроен.",
      );
    }

    const sections = await PermissionService.getAvailableSections(subject);

    if (!sections.length) {
      throw new ManageError("У вас нет доступа ни к одному разделу управления.");
    }

    return ManageContainer.hub(sections);
  }

  public static async openSection(
    interaction: BaseInteraction,
    sectionId: string,
  ): Promise<ContainerBuilder> {
    const section = getManageSection(sectionId);

    if (!section) {
      throw new ManageError("Раздел не найден.");
    }

    const subject = await PermissionService.resolveSubject(interaction);

    await PermissionService.assertCanUse(subject, section.key);

    switch (section.id) {
      case ManageSectionId.Awards:
        return AwardContainer.root(await AwardService.getAwards());

      case ManageSectionId.Characters:
        return ManageCharacterContainer.root();

      case ManageSectionId.Spells:
        return SpellContainer.page(await SpellService.getPage(0), SpellMode.Manage);

      case ManageSectionId.Shop:
        return ShopAdminContainer.root(await ShopService.listAllItems());

      case ManageSectionId.Coins:
        return CoinsAdminContainer.root(
          await StipendService.list(subject.guildId as string),
        );

      case ManageSectionId.Locations:
        return LocationAdminViews.root(interaction.client, subject.guildId as string);

      case ManageSectionId.Rolls:
        return RollAdminViews.root();

      case ManageSectionId.Runes:
        return RuneAdminViews.root();

      case ManageSectionId.Applications:
        return ApplicationAdminViews.root(interaction.client);

      case ManageSectionId.Giveaways:
        return GiveawayAdminViews.root(interaction.client, subject.guildId as string);

      case ManageSectionId.PingRoles:
        return PingRoleAdminViews.root(interaction.client);

      case ManageSectionId.Reports: {
        const view = await ReportReviewers.getView(subject.guildId as string, 0);

        return ReportAdminContainer.root(view.roleIds, view.rolePage, view.roleNames);
      }

      case ManageSectionId.Permissions: {
        const overview = await PermissionService.getOverview(subject);

        return PermissionContainer.overview(overview.targets, overview.roleNames);
      }
    }
  }
}
