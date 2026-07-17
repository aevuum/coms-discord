import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ContainerBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from "discord.js";

import {
  Character,
  CharacterTupper,
} from "../../../database/generated/prisma/client.js";

export class TupperComponents {
  public static createCharacterSelect(
    characters: (Character & {
      tupper: CharacterTupper | null;
    })[],
  ) {
    return [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId("tupper_select_character")
          .setPlaceholder("Выберите персонажа")
          .addOptions(
            characters.map((character) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(character.rpName)
                .setValue(character.id),
            ),
          ),
      ),
    ];
  }

  public static createSettings(
    character: Character & {
      tupper: CharacterTupper | null;
    },
  ) {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `<:928205membericon:1518581050555633674> ${character.rpName}

### <a:83918animatedarrowgreen:1518587316879495249> Имя таппера

${character.tupper?.name ?? "-"}

### <a:83918animatedarrowgreen:1518587316879495249> Тег

${character.tupper?.prefix ?? "-"}`,
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );

    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "<:48765whitearrow:1518587298281685173> Изменить имя таппера",
          ),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(`tupper_name_${character.id}`)
            .setLabel("Изменить имя")
            .setStyle(ButtonStyle.Secondary),
        ),
    );

    container.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            "<:48765whitearrow:1518587298281685173> Изменить тег таппера",
          ),
        )
        .setButtonAccessory(
          new ButtonBuilder()
            .setCustomId(`tupper_prefix_${character.id}`)
            .setLabel("Изменить тег")
            .setStyle(ButtonStyle.Primary),
        ),
    );

    return [container];
  }
}
