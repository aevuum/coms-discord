import {
  ActionRowBuilder,
  UserSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  ComponentType,
} from "discord.js";
import { AwardService } from "../service/awardService.js";
import { IPanelSession } from "../types/award.js";

export class AwardPanelBuilder {
  public static parseEmoji(emojiStr: string) {
    if (!emojiStr) return undefined;
    const value = emojiStr.trim();

    const custom = value.match(/^<a?:([a-zA-Z0-9_]+):(\d+)>$/);
    if (custom) {
      return {
        id: custom[2],
        name: custom[1],
      };
    }

    if (
      /\p{Extended_Pictographic}/u.test(value) ||
      /\p{Emoji_Presentation}/u.test(value)
    ) {
      return {
        name: value,
      };
    }

    return undefined;
  }

  public static async build(
    session: IPanelSession,
    errorMessage?: string,
  ): Promise<any> {
    const allAwards = await AwardService.getAwards();
    const components: any[] = [];

    let textHeader = "";

    switch (session.state) {
      case "DELETE_SELECT":
        textHeader =
          "### <:14605delete:1518587266505642074> Удаление награды\n\nВыберите из списка награду, которую хотите навсегда удалить.";
        break;
      case "GIVE_USER":
        textHeader =
          "### <:972712donator:1518581051960852601> Выдача награды\n\nШаг 1: Выберите пользователя, которому хотите вручить награду.";
        break;
      case "TAKE_USER":
        textHeader =
          "### <:984149edit:1518587370474176612> Изъятие награды\n\nШаг 1: Выберите пользователя, у которого нужно забрать награду.";
        break;
      case "TAKE_SELECT":
        if (session.targetUserId) {
          textHeader = `### <:984149edit:1518587370474176612> Изъятие награды у <@${session.targetUserId}>\n\nШаг 2: Выберите из списка его текущих наград ту, которую нужно забрать.`;
        } else {
          textHeader =
            "### <:928205membericon:1518581050555633674> Панель управления наградами\n\nВыберите действие при помощи кнопок ниже.";
        }
        break;
      default:
        textHeader =
          "### <:928205membericon:1518581050555633674> Панель управления наградами\n\nВыберите действие при помощи кнопок ниже.";
        break;
    }

    if (session.state === "MAIN") {
      if (allAwards.length === 0) {
        textHeader +=
          "\n\n <a:38899greenloading:1518587295354064956> Нету наград доступных для взаимодействия";
      } else {
        textHeader +=
          "\n\n### <a:83918animatedarrowgreen:1518587316879495249> Список всех доступных наград:\n";
        allAwards.forEach((a) => {
          const emojiDisplay = a.emoji ? `${a.emoji} ` : "";
          textHeader += `• ${emojiDisplay}**${a.label}** — ${a.description} (\`${a.rarity}\` | **${a.rewardComsCoins} COMS**)\n`;
        });
      }
    } else if (allAwards.length === 0 && session.state === "DELETE_SELECT") {
      textHeader +=
        "\n\n* <a:38899greenloading:1518587295354064956> Нету наград доступных для взаимодействия*";
    }

    if (errorMessage) {
      textHeader += `\n\n<:240191mark:1518581039172292688> **Ошибка:** ${errorMessage}`;
    }

    components.push({
      type: ComponentType.Container,
      components: [{ type: ComponentType.TextDisplay, content: textHeader }],
    });

    if (session.state === "DELETE_SELECT" && allAwards.length > 0) {
      const { StringSelectMenuBuilder } = await import("discord.js");
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("award_panel_delete_execute")
        .setPlaceholder("Выберите награду для удаления...")
        .addOptions(
          allAwards.slice(0, 25).map((a) => {
            const baseOption: any = {
              label: a.label,
              value: a.label,
            };
            const emojiPayload = this.parseEmoji(a.emoji);
            if (emojiPayload) baseOption.emoji = emojiPayload;
            return baseOption;
          }),
        );
      components.push(new ActionRowBuilder<any>().addComponents(selectMenu));
    }

    if (session.state === "GIVE_USER") {
      const userSelect = new UserSelectMenuBuilder()
        .setCustomId("award_panel_give_user_select")
        .setPlaceholder("Выберите получателя...");
      components.push(
        new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect),
      );
    }

    if (session.state === "TAKE_USER") {
      const userSelect = new UserSelectMenuBuilder()
        .setCustomId("award_panel_take_user_select")
        .setPlaceholder("Выберите пользователя...");
      components.push(
        new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect),
      );
    }

    if (session.state === "TAKE_SELECT" && session.targetUserId) {
      const userAwards = await AwardService.getAwards();
      const filteredAwards: any[] = [];
      const { AwardRepository } =
        await import("../repositories/awardRepository.js");
      const dbUser = await AwardRepository.findUserByDiscordId(
        session.targetUserId,
      );

      if (dbUser) {
        for (const award of userAwards) {
          const hasAward = await AwardRepository.findUserAward(
            dbUser.id,
            award.id,
          );
          if (hasAward) filteredAwards.push(award);
        }
      }

      if (filteredAwards.length > 0) {
        const { StringSelectMenuBuilder } = await import("discord.js");
        const selectMenu = new StringSelectMenuBuilder()
          .setCustomId("award_panel_take_execute")
          .setPlaceholder("Выберите награду для удаления у игрока...")
          .addOptions(
            filteredAwards.slice(0, 25).map((a) => {
              const baseOption: any = {
                label: a.label,
                value: a.label,
              };
              const emojiPayload = this.parseEmoji(a.emoji);
              if (emojiPayload) baseOption.emoji = emojiPayload;
              return baseOption;
            }),
          );
        components.push(new ActionRowBuilder<any>().addComponents(selectMenu));
      } else {
        components.push({
          type: ComponentType.Container,
          components: [
            {
              type: ComponentType.TextDisplay,
              content:
                "*У этого пользователя нет доступных наград для удаления.*",
            },
          ],
        });
      }
    }

    const navigationRow = new ActionRowBuilder<ButtonBuilder>();

    if (session.state !== "MAIN") {
      navigationRow.addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setLabel("Назад")
          .setCustomId("award_panel_back")
          .setEmoji("<:48765whitearrow:1518587298281685173>"),
      );
    }

    if (session.state === "MAIN") {
      navigationRow.addComponents(
        new ButtonBuilder()
          .setStyle(ButtonStyle.Success)
          .setLabel("Создать")
          .setCustomId("award_panel_nav_create")
          .setEmoji("<:6509addguild:1518587247769817088>"),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Primary)
          .setLabel("Выдать")
          .setCustomId("award_panel_nav_give")
          .setEmoji("<:972712donator:1518581051960852601>"),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setLabel("Забрать")
          .setCustomId("award_panel_nav_take")
          .setEmoji("<:984149edit:1518587370474176612>"),
        new ButtonBuilder()
          .setStyle(ButtonStyle.Danger)
          .setLabel("Удалить")
          .setCustomId("award_panel_nav_delete")
          .setEmoji("<:14605delete:1518587266505642074>"),
      );
    }

    if (navigationRow.components.length > 0) {
      components.push(navigationRow);
    }

    return {
      components,
      flags: MessageFlags.Ephemeral | (1 << 15),
    };
  }
}
