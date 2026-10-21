import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
} from "discord.js";

import { ManageComponents } from "../../manage/lib/manageComponents.js";
import type { RolePage } from "../../permissions/types/permissions.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const HEADER = "<:sec_complaints:1562521776020258826>";

export enum ReportAdminAction {
  Page = "page",
  Roles = "roles",
  Clear = "clear",
}

const PREFIX = "reportadmin";

export class ReportAdminCustomIds {
  public static build(action: ReportAdminAction, ...args: (string | number)[]) {
    return [PREFIX, action, ...args].join(":");
  }

  public static parse(customId: string) {
    const [prefix, action, ...args] = customId.split(":");

    if (prefix !== PREFIX || !Object.values(ReportAdminAction).includes(action as ReportAdminAction)) {
      return null;
    }

    return { action: action as ReportAdminAction, page: Number(args[0]) || 0 };
  }
}

export class ReportAdminContainer {
  public static root(roleIds: string[], rolePage: RolePage, roleNames: Map<string, string>) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${HEADER} Жалобы`,
          "",
          `${ARROW} Здесь выбираются роли, которые могут рассматривать жалобы: брать их в работу, принимать меры и отклонять.`,
          `${ARROW} Администраторы сервера могут рассматривать жалобы всегда.`,
          `${ARROW} Никто не может рассматривать жалобу на самого себя или свою собственную жалобу.`,
          "",
          "**Роли с доступом:**",
          roleIds.length
            ? roleIds.map((roleId) => `\`@${roleNames.get(roleId) ?? "удалённая роль"}\``).join(", ")
            : "-# Не выбраны — рассматривать жалобы могут только администраторы.",
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

    if (rolePage.roles.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(ReportAdminCustomIds.build(ReportAdminAction.Roles, rolePage.page))
            .setPlaceholder(
              rolePage.totalPages > 1
                ? `Роли · страница ${rolePage.page + 1} из ${rolePage.totalPages}`
                : "Роли, которые рассматривают жалобы",
            )
            .setMinValues(0)
            .setMaxValues(rolePage.roles.length)
            .addOptions(
              rolePage.roles.map((role) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(role.name.slice(0, 100))
                  .setValue(role.id)
                  .setDefault(roleIds.includes(role.id)),
              ),
            ),
        ),
      );
    }

    const buttons: ButtonBuilder[] = [];

    if (rolePage.totalPages > 1) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(ReportAdminCustomIds.build(ReportAdminAction.Page, rolePage.page - 1))
          .setEmoji("<:26204blackarrow:1518587278467792997>")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(rolePage.page <= 0),
        new ButtonBuilder()
          .setCustomId(ReportAdminCustomIds.build(ReportAdminAction.Page, rolePage.page + 1))
          .setEmoji("<:48765whitearrow:1518587298281685173>")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(rolePage.page >= rolePage.totalPages - 1),
      );
    }

    buttons.push(
      new ButtonBuilder()
        .setCustomId(ReportAdminCustomIds.build(ReportAdminAction.Clear, rolePage.page))
        .setLabel("Сбросить")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(!roleIds.length),
      ManageComponents.homeButton(),
    );

    container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(buttons));

    return container;
  }
}
