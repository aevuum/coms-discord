import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import {
  UserSelectMenuInteraction,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  FileUploadBuilder,
  LabelBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { CharacterService } from "../service/characterService.js";
import { ManageCharacterContainer } from "../lib/manageCharacterContainer.js";

export class ManageCharacterUserSelectHandler extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.SelectMenu,
    });
  }

  public override parse(interaction: UserSelectMenuInteraction) {
    if (!interaction.customId.startsWith("manage_character_user_")) {
      return this.none();
    }

    const action = interaction.customId.replace("manage_character_user_", "");

    return this.some({
      action,
    });
  }

  public override async run(
    interaction: UserSelectMenuInteraction,
    result: {
      action: "create" | "delete" | "freeze" | "unfreeze" | "kill";
    },
  ) {
    const userId = interaction.values[0];

    if (result.action === "create") {
      const nameInput = new TextInputBuilder()
        .setCustomId("character_name")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const nameLabel = new LabelBuilder()
        .setLabel("Имя персонажа")
        .setTextInputComponent(nameInput);

      const avatarUpload = new FileUploadBuilder()
        .setCustomId("character_avatar")
        .setRequired(false);

      const avatarLabel = new LabelBuilder()
        .setLabel("Аватар персонажа")
        .setDescription("Загрузите изображение персонажа")
        .setFileUploadComponent(avatarUpload);

      const facultySelect = new StringSelectMenuBuilder()
        .setCustomId("character_faculty")
        .setPlaceholder("Выберите факультет")
        .addOptions(
          {
            label: "Гриффиндор",
            value: "GRYFFINDOR",
            emoji: "<:grifinoria:1519583216992784567>",
          },
          {
            label: "Слизерин",
            value: "SLYTHERIN",
            emoji: "<:slytherincrest:1519583221988196392>",
          },
          {
            label: "Пуффендуй",
            value: "HUFFLEPUFF",
            emoji: "<:hufflepuff:1519583218544676873>",
          },
          {
            label: "Когтевран",
            value: "RAVENCLAW",
            emoji: "<:ravenclaw:1519583220327252048>",
          },
          {
            label: "Взрослый",
            value: "ADULT",
            emoji: "<:515636magicwandids:1519585028596563968>",
          },
        );

      const facultyLabel = new LabelBuilder()
        .setLabel("Факультет")
        .setDescription("Выберите факультет персонажа")
        .setStringSelectMenuComponent(facultySelect);

      const modal = new ModalBuilder()
        .setCustomId(`manage_character_modal_${userId}`)
        .setTitle("Создание персонажа")
        .addLabelComponents(nameLabel, avatarLabel, facultyLabel);

      await interaction.showModal(modal);
      return;
    }

    const characters = await CharacterService.getCharacters(userId);

    if (!characters.length) {
      await interaction.reply({
        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
        components: [
          ManageCharacterContainer.createError(
            "У пользователя нет персонажей.",
          ),
        ],
      });

      return;
    }

    await interaction.update({
      flags: MessageFlags.IsComponentsV2,
      components: [
        ManageCharacterContainer.buildCharacterSelection(
          result.action as any,
          userId,
          characters,
        ),
      ],
    });
  }
}
