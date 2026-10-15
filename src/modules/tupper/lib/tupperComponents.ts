import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  LabelBuilder,
  ModalBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  ThumbnailBuilder,
} from "discord.js";

import type { TupperCharacter } from "../types/tupper.js";
import { TupperCustomIds, TupperModalFields } from "./tupperCustomIds.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const GREEN_ARROW = "<a:83918animatedarrowgreen:1518587316879495249>";
const MAX_SELECT_OPTIONS = 25;

export class TupperComponents {
  public static characterSelect(characters: TupperCharacter[]) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(TupperCustomIds.select())
        .setPlaceholder("Выберите персонажа")
        .addOptions(
          characters.slice(0, MAX_SELECT_OPTIONS).map((character) => {
            const option = new StringSelectMenuOptionBuilder()
              .setLabel(character.rpName.slice(0, 100))
              .setValue(character.id);

            if (character.tupper) {
              option.setDescription(`Тег: ${character.tupper.prefix}`);
            }

            return option;
          }),
        ),
    );
  }

  public static selection(characters: TupperCharacter[]) {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:67793memberhexagon:1518587303218511892> Настройка персонажа",
          "",
          `${ARROW} Выберите персонажа, которого хотите настроить.`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${ARROW} После выбора персонажа откроются настройки его таппера.`,
      ),
    );

    container.addActionRowComponents(this.characterSelect(characters));

    return container;
  }

  public static settings(character: TupperCharacter, showBack: boolean) {
    const container = new ContainerBuilder();

    const header = new TextDisplayBuilder().setContent(
      [
        `# <:928205membericon:1518581050555633674> ${character.rpName}`,
        "",
        `${ARROW} Настройки таппера`,
      ].join("\n"),
    );

    if (character.avatarUrl) {
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(header)
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(character.avatarUrl),
          ),
      );
    } else {
      container.addTextDisplayComponents(header);
    }

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `### ${GREEN_ARROW} Имя таппера`,
          character.tupper?.name ?? "-",
          "",
          `### ${GREEN_ARROW} Тег`,
          character.tupper ? `\`${character.tupper.prefix}\`` : "-",
          "",
          character.tupper
            ? `-# Начните сообщение с тега, чтобы написать от лица персонажа: \`${character.tupper.prefix} Привет!\``
            : "-# Таппер будет создан автоматически при первой настройке.",
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );

    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${ARROW} Изменить имя таппера`),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(TupperCustomIds.name(character.id))
            .setLabel("Изменить имя")
            .setStyle(ButtonStyle.Secondary),
        ),
    );

    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`${ARROW} Изменить тег таппера`),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(TupperCustomIds.prefix(character.id))
            .setLabel("Изменить тег")
            .setStyle(ButtonStyle.Primary),
        ),
    );

    if (showBack) {
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      container.addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(TupperCustomIds.back())
            .setLabel("Назад")
            .setEmoji("<:26204blackarrow:1518587278467792997>")
            .setStyle(ButtonStyle.Secondary),
        ),
      );
    }

    return container;
  }

  public static nameModal(character: TupperCharacter) {
    const input = new TextInputBuilder()
      .setCustomId(TupperModalFields.Name)
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(2)
      .setMaxLength(80);

    if (character.tupper) {
      input.setValue(character.tupper.name);
    }

    return new ModalBuilder()
      .setCustomId(TupperCustomIds.nameModal(character.id))
      .setTitle("Изменение имени")
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Новое имя")
          .setDescription("Имя, под которым будут отправляться сообщения")
          .setTextInputComponent(input),
      );
  }

  public static prefixModal(character: TupperCharacter) {
    const input = new TextInputBuilder()
      .setCustomId(TupperModalFields.Prefix)
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(32)
      .setPlaceholder("[Гарри]");

    if (character.tupper) {
      input.setValue(character.tupper.prefix);
    }

    return new ModalBuilder()
      .setCustomId(TupperCustomIds.prefixModal(character.id))
      .setTitle("Изменение тега")
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Новый тег")
          .setDescription("С этого тега должно начинаться сообщение")
          .setTextInputComponent(input),
      );
  }

  public static error(message: string) {
    const container = new ContainerBuilder();

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
}
