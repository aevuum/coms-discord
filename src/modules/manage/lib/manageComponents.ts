import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import type { ManageSection, MemberOption } from "../types/manage.js";
import { ManageCustomIds, MEMBER_QUERY_FIELD } from "./manageCustomIds.js";

export class ManageComponents {
  public static homeButton() {
    return new ButtonBuilder()
      .setCustomId(ManageCustomIds.home())
      .setLabel("Меню управления")
      .setEmoji("<:563621mod8:1518587360886128661>")
      .setStyle(ButtonStyle.Secondary);
  }

  public static homeRow() {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      this.homeButton(),
    );
  }

  public static sectionSelect(sections: ManageSection[]) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(ManageCustomIds.section())
        .setPlaceholder("Выберите систему")
        .addOptions(
          sections.map((section) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(section.label)
              .setDescription(section.description.slice(0, 100))
              .setEmoji(section.emoji)
              .setValue(section.id),
          ),
        ),
    );
  }

  public static memberSearchButton(customId: string, label = "Найти игрока") {
    return new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setEmoji("<:67793memberhexagon:1518587303218511892>")
      .setStyle(ButtonStyle.Primary);
  }

  public static memberSearchModal(customId: string, title: string) {
    return new ModalBuilder()
      .setCustomId(customId)
      .setTitle(title.slice(0, 45))
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Игрок")
          .setDescription("Ник, имя на сервере или Discord ID")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(MEMBER_QUERY_FIELD)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMinLength(2)
              .setMaxLength(64),
          ),
      );
  }

  public static memberSelect(customId: string, members: MemberOption[]) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder("Выберите игрока")
        .addOptions(
          members.slice(0, 25).map((member) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(member.displayName.slice(0, 100))
              .setDescription(`@${member.username} · ${member.id}`.slice(0, 100))
              .setValue(member.id),
          ),
        ),
    );
  }
}
