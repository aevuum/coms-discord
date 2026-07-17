import { ButtonBuilder, ButtonStyle } from "discord.js";
import { CharacterService } from "../../character/service/characterService.js";

export class TupperViewService {
  public static async create(characterId: string) {
    const character = await CharacterService.getCharacterById(characterId);

    if (!character) throw new Error("Character not found.");

    return {
      content: `## ⚙ ${character.rpName}

### Имя

${character.tupper?.displayName}

### Тег

${character.tupper?.prefix}`,

      components: [
        {
          type: 1,

          components: [
            new ButtonBuilder()

              .setCustomId(`tupper_name_${character.id}`)

              .setLabel("Изменить имя")

              .setStyle(ButtonStyle.Secondary),

            new ButtonBuilder()

              .setCustomId(`tupper_prefix_${character.id}`)

              .setLabel("Изменить тег")

              .setStyle(ButtonStyle.Primary),
          ],
        },
      ],
    };
  }
}
