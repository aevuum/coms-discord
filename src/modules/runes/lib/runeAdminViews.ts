import { RuneDesignStatus } from "../../../database/generated/prisma/client.js";

import { ArtifactService } from "../service/artifactService.js";
import { FormulaService } from "../service/formulaService.js";
import { RuneAudit } from "../service/runeAudit.js";
import { RuneRegistry } from "../service/runeRegistry.js";
import { RuneService } from "../service/runeService.js";
import { RuneAdminContainer } from "./runeAdminContainer.js";
import { RuneAdminSection } from "./runeAdminCustomIds.js";

const ALL_STATUSES = [
  RuneDesignStatus.PENDING,
  RuneDesignStatus.DRAFT,
  RuneDesignStatus.APPROVED,
  RuneDesignStatus.DISABLED,
  RuneDesignStatus.REJECTED,
];

export class RuneAdminViews {
  public static async root(notice: string | null = null) {
    const [requests, attempts, formulas, recipes] = await Promise.all([
      RuneService.pendingRequests(),
      FormulaService.pendingAttempts(),
      FormulaService.count(RuneDesignStatus.PENDING),
      ArtifactService.countRecipes(RuneDesignStatus.PENDING),
    ]);

    return RuneAdminContainer.root({ requests: requests.length, attempts: attempts.length, formulas, recipes }, notice);
  }

  public static async section(section: RuneAdminSection, notice: string | null = null) {
    switch (section) {
      case RuneAdminSection.Requests:
        return RuneAdminContainer.requests(await RuneService.pendingRequests(), notice);

      case RuneAdminSection.Attempts:
        return RuneAdminContainer.attempts(await FormulaService.pendingAttempts(), notice);

      case RuneAdminSection.Formulas:
        return RuneAdminContainer.formulas(await FormulaService.list(ALL_STATUSES), notice);

      case RuneAdminSection.Recipes: {
        const recipes = await ArtifactService.listRecipes(ALL_STATUSES);

        return RuneAdminContainer.recipes(
          await Promise.all(recipes.map(async (recipe) => ({ recipe, ...(await ArtifactService.recipeLoad(recipe)) }))),
          notice,
        );
      }

      case RuneAdminSection.Runes:
        return RuneAdminContainer.runes(await RuneRegistry.all(), await RuneRegistry.getSettings());

      case RuneAdminSection.Materials:
        return RuneAdminContainer.materials(await ArtifactService.listMaterials(), notice);

      case RuneAdminSection.Blanks:
        return RuneAdminContainer.blanks(await ArtifactService.listBlanks(), notice);

      case RuneAdminSection.Settings:
        return RuneAdminContainer.settings(await RuneRegistry.getSettings(), notice);

      case RuneAdminSection.History:
        return RuneAdminContainer.history(await RuneAudit.recent(15), await RuneRegistry.all());

      default:
        return this.root(notice);
    }
  }

  public static async request(id: string) {
    return RuneAdminContainer.request(await RuneService.getRequest(id), await RuneRegistry.getSettings());
  }

  public static async attempt(id: string) {
    const attempt = await FormulaService.getAttempt(id);

    return RuneAdminContainer.attempt(attempt, await RuneService.mastery(attempt.characterId, attempt.formula!.runeKey));
  }

  public static async formula(id: string, notice: string | null = null) {
    return RuneAdminContainer.formula(await FormulaService.get(id), await RuneRegistry.getSettings(), notice);
  }

  public static async recipe(id: string, notice: string | null = null) {
    const recipe = await ArtifactService.getRecipe(id);
    const { load, capacity } = await ArtifactService.recipeLoad(recipe);

    return RuneAdminContainer.recipe(recipe, load, capacity, await RuneRegistry.getSettings(), notice);
  }

  public static async rune(key: string, notice: string | null = null) {
    return RuneAdminContainer.rune(await RuneRegistry.get(key), await RuneRegistry.getSettings(), notice);
  }
}
