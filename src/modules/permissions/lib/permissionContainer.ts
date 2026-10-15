import {
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from "discord.js";

import {
  CommandAccess,
  type CommandPermissionEntry,
} from "../types/permissions.js";
import { PermissionComponents } from "./permissionComponents.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";

export class PermissionContainer {
  public static overview(commands: CommandPermissionEntry[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:72943adminhexagon:1518587307945492480> Доступ к командам",
          "",
          `${ARROW} Выберите команду, чтобы назначить роли, которым она доступна.`,
          "-# Администраторы сервера имеют доступ ко всем командам.",
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        commands
          .map(
            (command) =>
              `${ARROW} **/${command.name}** — ${this.accessText(command)}`,
          )
          .join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      PermissionComponents.commandSelect(commands),
    );

    return container;
  }

  public static command(command: CommandPermissionEntry, maxRoles: number) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# <:72943adminhexagon:1518587307945492480> /${command.name}`,
          "",
          `${ARROW} ${command.description || "Без описания"}`,
          `${ARROW} Без назначенных ролей: **${
            command.access === CommandAccess.Public
              ? "все участники"
              : "только администраторы"
          }**`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "## <:67793memberhexagon:1518587303218511892> Роли с доступом",
          "",
          command.roleIds.length
            ? command.roleIds.map((roleId) => `<@&${roleId}>`).join(" ")
            : `${ARROW} Роли не назначены.`,
          "",
          "-# Если роли назначены, команду могут использовать только они и администраторы.",
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      PermissionComponents.roleSelect(command, maxRoles),
    );

    container.addActionRowComponents(
      PermissionComponents.commandActions(command),
    );

    return container;
  }

  public static error(message: string) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:240191mark:1518581039172292688> Ошибка",
          "",
          `${ARROW} ${message}`,
        ].join("\n"),
      ),
    );

    return container;
  }

  private static accessText(command: CommandPermissionEntry) {
    if (command.roleIds.length) {
      return command.roleIds.map((roleId) => `<@&${roleId}>`).join(" ");
    }

    return command.access === CommandAccess.Public
      ? "все участники"
      : "только администраторы";
  }
}
