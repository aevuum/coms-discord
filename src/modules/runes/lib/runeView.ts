import { RuneRequestStatus } from "../../../database/generated/prisma/client.js";

import { FormulaService } from "../service/formulaService.js";
import { RuneRegistry } from "../service/runeRegistry.js";
import { RuneService } from "../service/runeService.js";
import { RuneContainer } from "./runeContainer.js";
import { RuneTab } from "./runeCustomIds.js";

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

  public static async character(
    discordId: string,
    characterId: string,
    tab: RuneTab = RuneTab.Runes,
    page = 0,
    notice: string | null = null,
  ) {
    const character = await RuneService.getOwnedCharacter(discordId, characterId);

    const [characters, learned, runes, formulas, requests] = await Promise.all([
      RuneService.getCharacters(discordId),
      RuneService.learned(character.id),
      RuneRegistry.all(),
      FormulaService.available(character.id),
      RuneService.characterRequests(character.id),
    ]);

    return RuneContainer.view(
      character,
      Object.values(RuneTab).includes(tab) ? tab : RuneTab.Runes,
      { learned, runes, formulas, requests },
      page,
      characters.length > 1,
      notice,
    );
  }

  public static async runeInfo(discordId: string, characterId: string, runeKey: string) {
    const character = await RuneService.getOwnedCharacter(discordId, characterId);
    const [rune, mastery, requests] = await Promise.all([
      RuneRegistry.get(runeKey),
      RuneService.mastery(character.id, runeKey),
      RuneService.characterRequests(character.id),
    ]);

    const pending = requests.some((request) => request.runeKey === runeKey && request.status === RuneRequestStatus.PENDING);

    return RuneContainer.runeInfo(character, rune, mastery, pending);
  }

  public static async formula(discordId: string, characterId: string, formulaId: string) {
    const character = await RuneService.getOwnedCharacter(discordId, characterId);
    const entry = (await FormulaService.available(character.id)).find((item) => item.formula.id === formulaId);

    if (!entry) {
      return this.character(discordId, character.id, RuneTab.Formulas, 0, null);
    }

    return RuneContainer.formulaDetail(character.id, entry);
  }
}
