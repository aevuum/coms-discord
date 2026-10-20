import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  LabelBuilder,
  ModalBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import type { PingRole } from "../../../database/generated/prisma/client.js";

import { ManageComponents } from "../../manage/lib/manageComponents.js";
import type { RolePage } from "../../permissions/types/permissions.js";
import { PING_ROLES_MAX, PingRoleAdminAction, PingRoleAdminIds, PingRoleFields } from "./pingRoles.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const HEADER = "<:21796announcement:1518587271303925830>";
const PREV = "<:26204blackarrow:1518587278467792997>";
const NEXT = "<:48765whitearrow:1518587298281685173>";

export class PingRoleAdminContainer {
  public static root(roles: PingRole[], roleName: (id: string) => string) {
    const container = this.base("Пинг-роли", [
      `${ARROW} Роли, которые участники сами выбирают на панели пинг-ролей. Изменения сразу появляются на панели.`,
      `${ARROW} Добавлять можно только роли без прав модерации и управления, и они должны быть ниже роли бота.`,
      "",
      roles.length
        ? roles
            .map((role, index) => `\`${index + 1}.\` ${role.emoji ?? ARROW} **${role.label}** · \`@${roleName(role.roleId)}\``)
            .join("\n")
        : "-# На панели пока нет ролей.",
    ]);

    if (roles.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(PingRoleAdminIds.build(PingRoleAdminAction.View))
            .setPlaceholder("Выберите роль для настройки")
            .addOptions(
              roles.map((role) => {
                const option = new StringSelectMenuOptionBuilder()
                  .setValue(role.roleId)
                  .setLabel(role.label.slice(0, 100))
                  .setDescription(`@${roleName(role.roleId)}`.slice(0, 100));

                if (role.emoji) {
                  option.setEmoji(role.emoji);
                }

                return option;
              }),
            ),
        ),
      );
    }

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(PingRoleAdminIds.build(PingRoleAdminAction.AddPage, 0))
          .setLabel("Добавить роль")
          .setEmoji("<:6509addguild:1518587247769817088>")
          .setStyle(ButtonStyle.Success)
          .setDisabled(roles.length >= PING_ROLES_MAX),
        ManageComponents.homeButton(),
      ),
    );

    return container;
  }

  public static addPicker(rolePage: RolePage, existing: Set<string>) {
    const container = this.base("Добавить пинг-роль", [
      `${ARROW} Выберите роль сервера. Затем укажите, как она будет называться на панели.`,
    ]);

    const available = rolePage.roles.filter((role) => !existing.has(role.id));

    if (available.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(PingRoleAdminIds.build(PingRoleAdminAction.AddPick))
            .setPlaceholder(
              rolePage.totalPages > 1
                ? `Роль · страница ${rolePage.page + 1} из ${rolePage.totalPages}`
                : "Роль",
            )
            .addOptions(
              available.map((role) =>
                new StringSelectMenuOptionBuilder().setLabel(role.name.slice(0, 100)).setValue(role.id),
              ),
            ),
        ),
      );
    } else {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent("-# На этой странице все роли уже на панели."));
    }

    const row = new ActionRowBuilder<ButtonBuilder>();

    if (rolePage.totalPages > 1) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(PingRoleAdminIds.build(PingRoleAdminAction.AddPage, rolePage.page - 1))
          .setEmoji(PREV)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(rolePage.page <= 0),
        new ButtonBuilder()
          .setCustomId(PingRoleAdminIds.build(PingRoleAdminAction.AddPage, rolePage.page + 1))
          .setEmoji(NEXT)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(rolePage.page >= rolePage.totalPages - 1),
      );
    }

    row.addComponents(this.backButton(PingRoleAdminIds.build(PingRoleAdminAction.Root)));

    container.addActionRowComponents(row);

    return container;
  }

  public static view(role: PingRole, roleName: string, index: number, total: number) {
    const container = this.base(`${role.emoji ? `${role.emoji} ` : ""}${role.label}`, [
      `${ARROW} Роль сервера: \`@${roleName}\``,
      `${ARROW} Описание: ${role.description ?? "нет"}`,
      `${ARROW} Позиция на панели: ${index + 1} из ${total}`,
    ]);

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(PingRoleAdminIds.build(PingRoleAdminAction.Edit, role.roleId))
          .setLabel("Изменить")
          .setEmoji("<:984149edit:1518587370474176612>")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId(PingRoleAdminIds.build(PingRoleAdminAction.Up, role.roleId))
          .setEmoji("⬆️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(index === 0),
        new ButtonBuilder()
          .setCustomId(PingRoleAdminIds.build(PingRoleAdminAction.Down, role.roleId))
          .setEmoji("⬇️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(index >= total - 1),
        new ButtonBuilder()
          .setCustomId(PingRoleAdminIds.build(PingRoleAdminAction.Remove, role.roleId))
          .setLabel("Убрать с панели")
          .setEmoji("<:14605delete:1518587266505642074>")
          .setStyle(ButtonStyle.Danger),
        this.backButton(PingRoleAdminIds.build(PingRoleAdminAction.Root)),
      ),
    );

    return container;
  }

  public static removeConfirm(role: PingRole) {
    const container = this.base("Убрать роль с панели", [
      `${ARROW} Убрать **${role.label}** с панели пинг-ролей? Сама роль на сервере останется, у участников она тоже не снимется.`,
    ]);

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(PingRoleAdminIds.build(PingRoleAdminAction.RemoveConfirm, role.roleId))
          .setLabel("Убрать")
          .setStyle(ButtonStyle.Danger),
        this.backButton(PingRoleAdminIds.build(PingRoleAdminAction.View, role.roleId), "Отмена"),
      ),
    );

    return container;
  }

  public static modal(customId: string, title: string, values: { label: string; emoji: string; description: string }) {
    const input = (id: string, style: TextInputStyle, required: boolean, max: number, value: string) => {
      const field = new TextInputBuilder().setCustomId(id).setStyle(style).setRequired(required).setMaxLength(max);

      if (value) {
        field.setValue(value.slice(0, max));
      }

      return field;
    };

    return new ModalBuilder()
      .setCustomId(customId)
      .setTitle(title.slice(0, 45))
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Название на панели")
          .setTextInputComponent(input(PingRoleFields.Label, TextInputStyle.Short, true, 80, values.label)),
        new LabelBuilder()
          .setLabel("Эмодзи")
          .setDescription("Обычный эмодзи или эмодзи сервера <:имя:id>, можно оставить пустым")
          .setTextInputComponent(input(PingRoleFields.Emoji, TextInputStyle.Short, false, 64, values.emoji)),
        new LabelBuilder()
          .setLabel("Описание")
          .setDescription("О чём будет пинг, до 100 символов")
          .setTextInputComponent(input(PingRoleFields.Description, TextInputStyle.Short, false, 100, values.description)),
      );
  }

  public static cleanName(name: string) {
    return name.replace(/[^\p{L}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim();
  }

  private static backButton(customId: string, label = "Назад") {
    return new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setEmoji("<:172852arrowleft:1518587345249763452>")
      .setStyle(ButtonStyle.Secondary);
  }

  private static base(title: string, lines: string[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent([`# ${HEADER} ${title}`, "", ...lines].join("\n")),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));

    return container;
  }
}
