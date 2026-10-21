import { MemberSearchService } from "../../manage/service/memberSearchService.js";
import { CharacterInventoryService } from "../service/characterInventoryService.js";
import { CharacterService } from "../service/characterService.js";
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
    notice: string | null = null,
  ) {
    const [member, character, items] = await Promise.all([
      MemberSearchService.getMember(discordId),
      CharacterInventoryService.getOwnedCharacter(discordId, characterId),
      CharacterInventoryService.list(characterId),
    ]);

    return ManageCharacterContainer.dashboard(
      member?.displayName ?? discordId,
      discordId,
      character,
      items,
      notice,
    );
  }
}
