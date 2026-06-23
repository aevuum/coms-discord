import {
  ModalBuilder,
  FileUploadBuilder,
  LabelBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { Award, UserAward } from "../../../database/generated/prisma/client.js";
import { AwardPanelBuilder } from "../../award/lib/awardPanelBuilder.js";

type UserAwardWithAward = UserAward & {
  award: Award;
};

export class ProfileSettingsModal {
  public static create(
    targetUserId: string,
    awardids: UserAwardWithAward[],
    selectedAwardIdId?: string,
  ) {
    const fileUpload = new FileUploadBuilder()
      .setCustomId("profile_banner_file")
      .setRequired(false);

    const fileLabel = new LabelBuilder()
      .setLabel("Загрузите изображение для баннера")
      .setFileUploadComponent(fileUpload);

    const options =
      awardids.length > 0
        ? awardids.map((userAwardId) => ({
            label: userAwardId.award.label,
            value: userAwardId.award.id,
            emoji: (AwardPanelBuilder as any).parseEmoji(
              userAwardId.award.emoji,
            ),
            default: userAwardId.award.id === selectedAwardIdId,
          }))
        : [{ label: "Нет доступных наград", value: "none" }];

    const awardidSelect = new StringSelectMenuBuilder()
      .setCustomId("profile_primary_awardid")
      .setPlaceholder("Выберите основную награду")
      .addOptions(options);

    const awardidLabel = new LabelBuilder()
      .setLabel("Основная награда")
      .setDescription("Отображается под ником в профиле")
      .setStringSelectMenuComponent(awardidSelect);

    return new ModalBuilder()
      .setCustomId(`profile_settings_modal_${targetUserId}`)
      .setTitle("Настройки профиля")
      .addLabelComponents(fileLabel, awardidLabel);
  }
}
