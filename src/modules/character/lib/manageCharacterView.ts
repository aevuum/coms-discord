import { MemberSearchService } from "../../manage/service/memberSearchService.js";
import { CharacterInventoryService } from "../service/characterInventoryService.js";
import { CharacterService } from "../service/characterService.js";
import { RollService } from "../../rolls/service/rollService.js";
import { RollKind } from "../../rolls/types/rolls.js";
import { CharacterTab } from "../types/character.js";
import { ManageCharacterContainer } from "./manageCharacterContainer.js";

export class ManageCharacterView {
  public static async player(discordId: string, notice: string | null = null) {
    const [member, characters] = await Promise.all([
      MemberSearchService.getMember(discordId),
      CharacterService.getCharacters(discordId),
    ]);

    return ManageCharacterContainer.player(
      member?.displayName ?? discordId,
      discordId,
      characters,
      notice,
    );
  }

  public static async character(
    discordId: string,
    characterId: string,
    tab: CharacterTab = CharacterTab.Profile,
    notice: string | null = null,
  ) {
    const [member, character, items, traits] = await Promise.all([
      MemberSearchService.getMember(discordId),
      CharacterInventoryService.getOwnedCharacter(discordId, characterId),
      CharacterInventoryService.list(characterId),
      RollService.list(RollKind.TRAIT),
    ]);

    return ManageCharacterContainer.dashboard(
      member?.displayName ?? discordId,
      discordId,
      character,
      items,
      tab,
      notice,
      traits,
    );
  }
}
