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

export enum SuggestionAdminAction {
  Root = "root",
  RolePage = "role_page",
  RoleSet = "role_set",
  RoleClear = "role_clear",
}

const PREFIX = "suggestadm";

export class SuggestionAdminIds {
  public static build(action: SuggestionAdminAction, ...args: (string | number)[]) {
    return [PREFIX, action, ...args].join(":");
  }

  public static parse(customId: string) {
    const [prefix, action, ...args] = customId.split(":");

    if (prefix !== PREFIX || !Object.values(SuggestionAdminAction).includes(action as SuggestionAdminAction)) {
      return null;
    }

    return { action: action as SuggestionAdminAction, page: Number(args[0]) || 0 };
  }
}

export class SuggestionAdminContainer {
  public static root(roleName: string | null) {
    const container = this.base("Идеи", [
      `${ARROW} Роль для пинга: ${roleName ? `\`@${roleName}\`` : "не выбрана — новые идеи публикуются без упоминания"}`,
      `${ARROW} Бот упомянет эту роль один раз, когда игрок опубликует новую идею. Голоса и решения не пингуют.`,
      "-# Чтобы игроки сами подписывались на пинг, добавьте эту роль в /manage → «Пинг-роли».",
    ]);

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(SuggestionAdminIds.build(SuggestionAdminAction.RolePage, 0))
          .setLabel("Роль для пинга")
          .setEmoji("🔔")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(SuggestionAdminIds.build(SuggestionAdminAction.RoleClear))
          .setLabel("Без пинга")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(!roleName),
        ManageComponents.homeButton(),
      ),
    );

    return container;
  }

  public static rolePicker(rolePage: RolePage, currentId: string | null) {
    const container = this.base("Роль для пинга идей", [
      `${ARROW} Выберите роль, которую бот упомянет при публикации новой идеи.`,
    ]);

    if (rolePage.roles.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(SuggestionAdminIds.build(SuggestionAdminAction.RoleSet))
            .setPlaceholder(
              rolePage.totalPages > 1
                ? `Роль · страница ${rolePage.page + 1} из ${rolePage.totalPages}`
                : "Роль",
            )
            .addOptions(
              rolePage.roles.map((role) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(role.name.slice(0, 100))
                  .setValue(role.id)
                  .setDefault(role.id === currentId),
              ),
            ),
        ),
      );
    }

    const row = new ActionRowBuilder<ButtonBuilder>();

    if (rolePage.totalPages > 1) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(SuggestionAdminIds.build(SuggestionAdminAction.RolePage, rolePage.page - 1))
          .setEmoji("<:26204blackarrow:1518587278467792997>")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(rolePage.page <= 0),
        new ButtonBuilder()
          .setCustomId(SuggestionAdminIds.build(SuggestionAdminAction.RolePage, rolePage.page + 1))
          .setEmoji("<:48765whitearrow:1518587298281685173>")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(rolePage.page >= rolePage.totalPages - 1),
      );
    }

    row.addComponents(
      new ButtonBuilder()
        .setCustomId(SuggestionAdminIds.build(SuggestionAdminAction.Root))
        .setLabel("Назад")
        .setEmoji("<:172852arrowleft:1518587345249763452>")
        .setStyle(ButtonStyle.Secondary),
    );

    container.addActionRowComponents(row);

    return container;
  }

  private static base(title: string, lines: string[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent([`# 💡 ${title}`, "", ...lines].join("\n")),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

    return container;
  }
}
