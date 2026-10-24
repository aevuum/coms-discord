import { ArtifactService } from "../service/artifactService.js";
import { RuneService } from "../service/runeService.js";
import { ArtifactContainer } from "./artifactContainer.js";
import { RuneContainer } from "./runeContainer.js";

export class ArtifactView {
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

    return ArtifactContainer.picker(characters);
  }

  public static async character(discordId: string, characterId: string) {
    const character = await RuneService.getOwnedCharacter(discordId, characterId);

    const [characters, artifacts, recipes] = await Promise.all([
      RuneService.getCharacters(discordId),
      ArtifactService.characterArtifacts(character.id),
      ArtifactService.craftable(character.id),
    ]);

    return ArtifactContainer.home(character, { artifacts, recipes }, characters.length > 1);
  }

  public static async craft(discordId: string, characterId: string, recipeId: string, extras: string[]) {
    const character = await RuneService.getOwnedCharacter(discordId, characterId);
    const [preview, materials] = await Promise.all([
      ArtifactService.preview(character.id, recipeId, extras),
      ArtifactService.listMaterials(),
    ]);

    if (preview.blockers.length) {
      return ArtifactContainer.craftPreview(character.id, preview, materials, null);
    }

    const { operation } = await ArtifactService.prepareCraft(discordId, character.id, recipeId, preview.extraMaterialIds);

    return ArtifactContainer.craftPreview(character.id, preview, materials, operation.id);
  }

  public static async confirm(discordId: string, characterId: string, operationId: string) {
    return ArtifactContainer.craftResult(characterId, await ArtifactService.confirmCraft(discordId, operationId));
  }

  public static async artifact(discordId: string, characterId: string, artifactId: string) {
    const character = await RuneService.getOwnedCharacter(discordId, characterId);

    return ArtifactContainer.artifactDetail(character.id, await ArtifactService.getArtifact(character.id, artifactId));
  }
}
