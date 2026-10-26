import {
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from "discord.js";

import { ManageComponents } from "../../manage/lib/manageComponents.js";
import {
  CommandAccess,
  type PermissionTargetEntry,
  type RolePage,
} from "../types/permissions.js";
import { PermissionComponents } from "./permissionComponents.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const HEADER = "<:sec_access:1562521769946906696>";

export class PermissionContainer {
  public static overview(
    targets: PermissionTargetEntry[],
    roleNames: Map<string, string>,
  ) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${HEADER} Доступ`,
          "",
          `${ARROW} Выберите команду или раздел управления, чтобы назначить роли.`,
          "-# Администраторы сервера имеют доступ ко всему.",
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        targets
          .map(
            (target) =>
              `${ARROW} **${target.label}** — ${this.accessText(target, roleNames)}`,
          )
          .join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      ...PermissionComponents.targetSelects(targets),
    );

    container.addActionRowComponents(ManageComponents.homeRow());

    return container;
  }

  public static target(
    target: PermissionTargetEntry,
    rolePage: RolePage,
    roleNames: Map<string, string>,
  ) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${HEADER} ${target.label}`,
          "",
          `${ARROW} ${target.description || "Без описания"}`,
          `${ARROW} Без назначенных ролей: **${
            target.access === CommandAccess.Public
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
          target.roleIds.length
            ? this.roleList(target.roleIds, roleNames)
            : `${ARROW} Роли не назначены.`,
          "",
          "-# Если роли назначены, доступ есть только у них и у администраторов.",
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    if (rolePage.roles.length) {
      container.addActionRowComponents(
        PermissionComponents.roleSelect(target, rolePage),
      );
    } else {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "-# На сервере нет ролей, которые можно назначить.",
        ),
      );
    }

    container.addActionRowComponents(
      PermissionComponents.targetActions(target, rolePage),
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

  private static roleList(roleIds: string[], roleNames: Map<string, string>) {
    return roleIds
      .map((roleId) => `\`@${roleNames.get(roleId) ?? "удалённая роль"}\``)
      .join(" ");
  }

  private static accessText(
    target: PermissionTargetEntry,
    roleNames: Map<string, string>,
  ) {
    if (target.roleIds.length) {
      return this.roleList(target.roleIds, roleNames);
    }

    return target.access === CommandAccess.Public
      ? "все участники"
      : "только администраторы";
  }
}
