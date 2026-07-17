import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import {
  ButtonInteraction,
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from "discord.js";

import { CharacterService } from "../../character/service/characterService.js";
import { TupperComponents } from "../lib/tupperComponents.js";

export class CharacterSettingsButton extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button,
    });
  }

  public override parse(interaction: ButtonInteraction) {
    if (!interaction.customId.startsWith("character_settings_")) {
      return this.none();
    }

    return this.some();
  }

  public override async run(interaction: ButtonInteraction) {
    const characters = await CharacterService.getCharacters(
      interaction.user.id,
    );

    if (!characters.length) {
      return interaction.reply({
        content: "У вас нет персонажей.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const container = new ContainerBuilder();

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "# <:67793memberhexagon:1518587303218511892> Настройка персонажа\n\n <:48765whitearrow:1518587298281685173> Выберите персонажа, которого хотите настроить.",
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        "<:48765whitearrow:1518587298281685173> После выбора персонажа откроются настройки его таппера.",
      ),
    );

    container.addActionRowComponents(
      ...TupperComponents.createCharacterSelect(characters),
    );

    await interaction.reply({
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      components: [container],
    });
  }
}
