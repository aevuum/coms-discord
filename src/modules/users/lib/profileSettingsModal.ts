import { ModalBuilder, FileUploadBuilder, LabelBuilder } from "discord.js";

export class ProfileSettingsModal {
  public static create(targetUserId: string) {
    const fileUpload = new FileUploadBuilder()
      .setCustomId("profile_banner_file")
      .setRequired(false);

    const fileLabel = new LabelBuilder()
      .setLabel("Загрузите изображение для баннера")
      .setFileUploadComponent(fileUpload);

    return new ModalBuilder()
      .setCustomId(`profile_settings_modal_${targetUserId}`)
      .setTitle("Настройки профиля")
      .addLabelComponents(fileLabel);
  }
}
