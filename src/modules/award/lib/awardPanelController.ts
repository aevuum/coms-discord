import {
  MessageComponentInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
  LabelBuilder,
} from "discord.js";
import { AwardPanelBuilder } from "./awardPanelBuilder.js";
import { IPanelSession, AwardPanelState } from "../types/award.js";
import { AwardService } from "../service/awardService.js";
import { AwardRarity } from "../../../database/generated/prisma/enums.js";

export class AwardPanelController {
  public static async handleInteraction(
    i: MessageComponentInteraction,
    session: IPanelSession,
  ): Promise<void> {
    let errorMsg: string | undefined = undefined;

    const stateNavigation: Record<string, AwardPanelState> = {
      award_panel_back: "MAIN",
      award_panel_nav_delete: "DELETE_SELECT",
      award_panel_nav_give: "GIVE_USER",
      award_panel_nav_take: "TAKE_USER",
    };

    if (i.customId === "award_panel_nav_create") {
      try {
        const modal = new ModalBuilder()
          .setCustomId("award_panel_modal_create")
          .setTitle("Создание награды");

        const labelText = new TextInputBuilder()
          .setCustomId("modal_label")
          .setLabel("Название награды")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);
        const emojiText = new TextInputBuilder()
          .setCustomId("modal_emoji")
          .setLabel("Эмодзи награды")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);
        const coinsText = new TextInputBuilder()
          .setCustomId("modal_coins")
          .setLabel("Количество COMS")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);
        const descText = new TextInputBuilder()
          .setCustomId("modal_desc")
          .setLabel("Описание")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const raritySelect = new StringSelectMenuBuilder()
          .setCustomId("modal_rarity")
          .setPlaceholder("Выберите редкость награды")
          .addOptions([
            {
              label: "<:99885bpll:1518587340111741038> Обычная (COMMON)",
              value: AwardRarity.COMMON,
            },
            {
              label: "<:99885bpll:1518587340111741038> Редкая (RARE)",
              value: AwardRarity.RARE,
            },
            {
              label: "<:99885bpll:1518587340111741038> Эпическая (EPIC)",
              value: AwardRarity.EPIC,
            },
            {
              label: "<:99885bpll:1518587340111741038> Легендарная (LEGENDARY)",
              value: AwardRarity.LEGENDARY,
            },
          ]);

        const rarityLabel = new LabelBuilder()
          .setLabel("Редкость награды")
          .setDescription("Укажите категорию ценности объекта")
          .setStringSelectMenuComponent(raritySelect);

        modal.setComponents([
          new ActionRowBuilder<TextInputBuilder>().addComponents(labelText),
          new ActionRowBuilder<TextInputBuilder>().addComponents(emojiText),
          new ActionRowBuilder<TextInputBuilder>().addComponents(coinsText),
          new ActionRowBuilder<TextInputBuilder>().addComponents(descText),
        ]);

        modal.addLabelComponents(rarityLabel);

        await i.showModal(modal);

        const submitted = await i
          .awaitModalSubmit({
            time: 60000,
            filter: (m) => m.customId === "award_panel_modal_create",
          })
          .catch(() => null);

        if (!submitted) {
          return;
        }

        try {
          const coins = parseInt(
            submitted.fields.getTextInputValue("modal_coins"),
          );
          if (isNaN(coins))
            throw new Error("Количество монет должно быть числом.");
          const emojiValue = submitted.fields
            .getTextInputValue("modal_emoji")
            .trim();

          const customEmojiRegex = /^<a?:([a-zA-Z0-9_]+):(\d+)>$/;

          const unicodeEmojiRegex =
            /^(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\uFE0F|\u200D)+$/u;

          if (
            !customEmojiRegex.test(emojiValue) &&
            !unicodeEmojiRegex.test(emojiValue)
          ) {
            throw new Error("Некорректный эмодзи. Пример: 🏆 ⭐ 🎖️");
          }
          const selectValues =
            submitted.fields.getStringSelectValues("modal_rarity");
          const rarityValue =
            selectValues && selectValues.length > 0
              ? selectValues[0]
              : undefined;

          if (!rarityValue)
            throw new Error("Необходимо выбрать редкость награды.");

          await AwardService.createAward({
            label: submitted.fields.getTextInputValue("modal_label"),
            emoji: emojiValue,
            description: submitted.fields.getTextInputValue("modal_desc"),
            rewardComsCoins: coins,
            rarity: rarityValue as AwardRarity,
          });

          session.state = "MAIN";
          const nextPayload = await AwardPanelBuilder.build(session);
          await submitted.reply(nextPayload);
        } catch (subError) {
          session.state = "MAIN";
          const errorPayload = await AwardPanelBuilder.build(
            session,
            (subError as Error).message,
          );
          await submitted.reply(errorPayload);
        }
      } catch (err) {
        console.error(err);
      }
      return;
    }

    try {
      const nextState = stateNavigation[i.customId];

      if (nextState) {
        session.state = nextState;
        if (nextState === "MAIN") session.targetUserId = undefined;
      } else {
        const firstValue = i.isAnySelectMenu() ? i.values[0] : undefined;

        switch (i.customId) {
          case "award_panel_delete_execute":
            if (firstValue) await AwardService.deleteAward(firstValue);
            session.state = "MAIN";
            break;

          case "award_panel_give_user_select":
            if (firstValue) {
              session.targetUserId = firstValue;
              const allAwards = await AwardService.getAwards();

              const customEmojiRegex = /^<?a?:?([^:]+):(\d+)>?$/i;

              const step2Select = new StringSelectMenuBuilder()
                .setCustomId("award_panel_give_execute")
                .setPlaceholder("Выберите награду...")
                .addOptions(
                  allAwards.map((a) => {
                    const baseOption: any = { label: a.label, value: a.label };
                    const cleanStr = a.emoji.trim();
                    const match = cleanStr.match(customEmojiRegex);

                    if (match && match[1] && match[2]) {
                      baseOption.emoji = { name: match[1], id: match[2] };
                    } else {
                      const unicodeRegex =
                        /^(?:\p{Extended_Pictographic}|\p{Emoji_Component}|\p{Emoji_Modifier}|\p{Emoji_Presentation})+$/u;
                      if (unicodeRegex.test(cleanStr)) {
                        baseOption.emoji = { name: cleanStr };
                      }
                    }
                    return baseOption;
                  }),
                );

              await i.update({
                components: [
                  {
                    type: ComponentType.Container,
                    components: [
                      {
                        type: ComponentType.TextDisplay,
                        content: `### <:984149edit:1518587370474176612> Выдача награды для <@${session.targetUserId}>\n\nШаг 2: Выберите из списка доступных наград ту, которую хотите выдать.`,
                      },
                    ],
                  },
                  new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                    step2Select,
                  ),
                  {
                    type: 1,
                    components: [
                      {
                        type: 2,
                        style: 2,
                        label: "Назад",
                        customId: "award_panel_back",
                        emoji: {
                          name: "<:48765whitearrow:1518587298281685173>",
                        },
                      },
                    ],
                  },
                ],
              });
              return;
            }
            break;

          case "award_panel_give_execute":
            if (session.targetUserId && firstValue) {
              await AwardService.giveAward(session.targetUserId, firstValue);
            }
            session.state = "MAIN";
            session.targetUserId = undefined;
            break;

          case "award_panel_take_user_select":
            if (firstValue) {
              session.targetUserId = firstValue;
              session.state = "TAKE_SELECT";
            }
            break;

          case "award_panel_take_execute":
            if (session.targetUserId && firstValue) {
              await AwardService.removeAward(session.targetUserId, firstValue);
            }
            session.state = "MAIN";
            session.targetUserId = undefined;
            break;

          case "award_panel_view_select":
            await i.deferUpdate();
            return;
        }
      }
    } catch (error) {
      errorMsg = (error as Error).message;
      session.state = "MAIN";
    }

    const nextPayload = await AwardPanelBuilder.build(session, errorMsg);
    await i.update(nextPayload);
  }
}
