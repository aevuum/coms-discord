import { RuneService } from "../service/runeService.js";
import { RuneContainer } from "./runeContainer.js";

export class RuneView {
  public static async start(discordId: string) {
    const characters = await RuneService.getCharacters(discordId);

    if (!characters.length) {
      return RuneContainer.notice(
        "<:240191mark:1518581039172292688> Нет персонажей",
        "У вас пока нет зарегистрированных персонажей.",
      );
    }

    if (characters.length === 1) {
      return this.character(discordId, characters[0].id);
    }

    return RuneContainer.picker(characters);
  }

  public static async character(discordId: string, characterId: string, page = 0) {
    const [character, characters] = await Promise.all([
      RuneService.getOwnedCharacter(discordId, characterId),
      RuneService.getCharacters(discordId),
    ]);

    return RuneContainer.view(
      character,
      await RuneService.learned(character.id),
      page,
      characters.length > 1,
    );
  }
}
