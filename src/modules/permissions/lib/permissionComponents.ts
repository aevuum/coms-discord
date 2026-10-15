import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

import {
  CommandAccess,
  type CommandPermissionEntry,
} from "../types/permissions.js";
import { PermissionCustomIds } from "./permissionCustomIds.js";

const MAX_SELECT_OPTIONS = 25;

export class PermissionComponents {
  public static commandSelect(commands: CommandPermissionEntry[]) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(PermissionCustomIds.command())
        .setPlaceholder("Выберите команду")
        .addOptions(
          commands.slice(0, MAX_SELECT_OPTIONS).map((command) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(`/${command.name}`)
              .setDescription(this.summary(command).slice(0, 100))
              .setValue(command.name),
          ),
        ),
    );
  }

  public static roleSelect(command: CommandPermissionEntry, maxRoles: number) {
    const menu = new RoleSelectMenuBuilder()
      .setCustomId(PermissionCustomIds.roles(command.name))
      .setPlaceholder("Выберите роли с доступом")
      .setMinValues(0)
      .setMaxValues(maxRoles);

    if (command.roleIds.length) {
      menu.setDefaultRoles(...command.roleIds);
    }

    return new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(menu);
  }

  public static commandActions(command: CommandPermissionEntry) {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(PermissionCustomIds.reset(command.name))
        .setLabel("Сбросить роли")
        .setEmoji("<:12138cross:1518587259669053591>")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!command.roleIds.length),

      new ButtonBuilder()
        .setCustomId(PermissionCustomIds.back())
        .setLabel("Назад")
        .setEmoji("<:26204blackarrow:1518587278467792997>")
        .setStyle(ButtonStyle.Secondary),
    );
  }

  public static summary(command: CommandPermissionEntry) {
    if (command.roleIds.length) {
      return `Ролей с доступом: ${command.roleIds.length}`;
    }

    return command.access === CommandAccess.Public
      ? "Все участники"
      : "Только администраторы";
  }
}
