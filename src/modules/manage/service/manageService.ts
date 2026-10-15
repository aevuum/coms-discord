import type { BaseInteraction, ContainerBuilder } from "discord.js";

import { AwardContainer } from "../../award/lib/awardContainer.js";
import { AwardService } from "../../award/service/awardService.js";
import { ManageCharacterContainer } from "../../character/lib/manageCharacterContainer.js";
import { PermissionContainer } from "../../permissions/lib/permissionContainer.js";
import { PermissionService } from "../../permissions/service/permissionService.js";
import { SpellContainer } from "../../spells/lib/spellContainer.js";
import { SpellService } from "../../spells/service/spellService.js";
import { SpellMode } from "../../spells/types/spells.js";
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

      case ManageSectionId.Permissions: {
        const overview = await PermissionService.getOverview(subject);

        return PermissionContainer.overview(overview.targets, overview.roleNames);
      }
    }
  }
}
