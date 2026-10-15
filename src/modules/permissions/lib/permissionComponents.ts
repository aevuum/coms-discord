import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

import { ManageComponents } from "../../manage/lib/manageComponents.js";
import {
  CommandAccess,
  type PermissionTargetEntry,
  type RolePage,
} from "../types/permissions.js";
import { PermissionCustomIds } from "./permissionCustomIds.js";

const MAX_SELECT_OPTIONS = 25;

export class PermissionComponents {
  public static targetSelect(targets: PermissionTargetEntry[]) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(PermissionCustomIds.target())
        .setPlaceholder("Выберите команду или раздел")
        .addOptions(
          targets.slice(0, MAX_SELECT_OPTIONS).map((target) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(target.label.slice(0, 100))
              .setDescription(this.summary(target).slice(0, 100))
              .setValue(target.key),
          ),
        ),
    );
  }

  public static roleSelect(target: PermissionTargetEntry, rolePage: RolePage) {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(PermissionCustomIds.roles(target.key, rolePage.page))
      .setPlaceholder(
        rolePage.totalPages > 1
          ? `Роли с доступом · страница ${rolePage.page + 1} из ${rolePage.totalPages}`
          : "Роли с доступом",
      )
      .setMinValues(0)
      .setMaxValues(rolePage.roles.length)
      .addOptions(
        rolePage.roles.map((role) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(role.name.slice(0, 100))
            .setValue(role.id)
            .setDefault(target.roleIds.includes(role.id)),
        ),
      );

    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
  }

  public static targetActions(
    target: PermissionTargetEntry,
    rolePage: RolePage,
  ) {
    const row = new ActionRowBuilder<ButtonBuilder>();

    if (rolePage.totalPages > 1) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(PermissionCustomIds.rolePage(target.key, rolePage.page - 1))
          .setEmoji("<:26204blackarrow:1518587278467792997>")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(rolePage.page <= 0),

        new ButtonBuilder()
          .setCustomId(PermissionCustomIds.rolePage(target.key, rolePage.page + 1))
          .setEmoji("<:48765whitearrow:1518587298281685173>")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(rolePage.page >= rolePage.totalPages - 1),
      );
    }

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(PermissionCustomIds.reset(target.key))
        .setLabel("Сбросить")
        .setEmoji("<:12138cross:1518587259669053591>")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!target.roleIds.length),

      new ButtonBuilder()
        .setCustomId(PermissionCustomIds.overview())
        .setLabel("К списку")
        .setEmoji("<:26204blackarrow:1518587278467792997>")
        .setStyle(ButtonStyle.Secondary),

      ManageComponents.homeButton(),
    );

    return row;
  }

  public static summary(target: PermissionTargetEntry) {
    if (target.roleIds.length) {
      return `Ролей с доступом: ${target.roleIds.length}`;
    }

    return target.access === CommandAccess.Public
      ? "Все участники"
      : "Только администраторы";
  }
}
