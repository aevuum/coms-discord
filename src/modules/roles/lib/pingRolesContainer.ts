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

import type { PingRole } from "../../../database/generated/prisma/client.js";

import { PingRolesCustomIds } from "./pingRoles.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const HEADER = "<:21796announcement:1518587271303925830>";

export class PingRolesContainer {
  public static panel(roles: PingRole[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${HEADER} Пинг-роли`,
          "",
          `${ARROW} Выберите, о чём вы хотите получать уведомления. Можно выбрать сразу несколько ролей.`,
          "-# Отмеченные роли будут выданы, остальные — сняты. Чтобы отказаться от всех уведомлений, нажмите «Снять все».",
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        roles.length
          ? roles
              .map((role) =>
                [`${role.emoji ?? ARROW} <@&${role.roleId}>`, role.description ? `-# ${role.description}` : null]
                  .filter((line) => line !== null)
                  .join("\n"),
              )
              .join("\n")
          : "-# Пинг-ролей пока нет.",
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    if (roles.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(PingRolesCustomIds.select)
            .setPlaceholder("Выберите пинг-роли")
            .setMinValues(1)
            .setMaxValues(roles.length)
            .addOptions(
              roles.map((role) => {
                const option = new StringSelectMenuOptionBuilder()
                  .setValue(role.roleId)
                  .setLabel(role.label);

                if (role.emoji) {
                  option.setEmoji(role.emoji);
                }

                if (role.description) {
                  option.setDescription(role.description);
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
          .setCustomId(PingRolesCustomIds.reset)
          .setLabel("Снять все")
          .setEmoji("<:12138cross:1518587259669053591>")
          .setStyle(ButtonStyle.Secondary),
      ),
    );

    return container;
  }

  public static result(added: string[], removed: string[], current: string[]) {
    const lines = ["# <:312537mark:1518581040548024430> Пинг-роли обновлены", ""];

    if (added.length) {
      lines.push(`${ARROW} Выданы: ${this.mentions(added)}`);
    }

    if (removed.length) {
      lines.push(`${ARROW} Сняты: ${this.mentions(removed)}`);
    }

    if (!added.length && !removed.length) {
      lines.push(`${ARROW} Ничего не изменилось.`);
    }

    lines.push(
      current.length
        ? `-# Сейчас у вас: ${this.mentions(current)}`
        : "-# Сейчас у вас нет пинг-ролей.",
    );

    return this.notice(lines.join("\n"));
  }

  public static error(message: string) {
    return this.notice(
      ["# <:240191mark:1518581039172292688> Ошибка", "", `${ARROW} ${message}`].join(
        "\n",
      ),
    );
  }

  private static mentions(ids: string[]) {
    return ids.map((id) => `<@&${id}>`).join(", ");
  }

  private static notice(content: string) {
    return new ContainerBuilder()
      .setAccentColor(0x475b56)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
  }
}
