export enum RuneAction {
  Pick = "pick",
  Back = "back",
  Tab = "tab",
  Page = "page",
  Info = "info",
  Study = "study",
  StudyModal = "study_modal",
  Formula = "formula",
  Try = "try",
  AttemptModal = "attempt_modal",
  Propose = "propose",
  ProposeModal = "propose_modal",
  Artifact = "artifact",
  Recipe = "recipe",
  Extras = "extras",
  Craft = "craft",
}

export enum RuneTab {
  Runes = "runes",
  Catalog = "catalog",
  Formulas = "formulas",
  Artifacts = "artifacts",
  Requests = "requests",
}

export const RuneModalFields = {
  PostUrl: "post_url",
  Note: "note",
  Spell: "spell",
  Rune: "rune",
  Incantation: "incantation",
  Effect: "effect",
  Mechanics: "mechanics",
} as const;

export class RuneCustomIds {
  private static readonly PREFIX = "rune";

  public static build(action: RuneAction, ...args: (string | number)[]) {
    return [this.PREFIX, action, ...args].join(":");
  }

  public static parse(customId: string) {
    const parts = customId.split(":");

    if (parts[0] !== this.PREFIX) return null;

    return {
      action: parts[1] as RuneAction,
      args: parts.slice(2),
    };
  }
}
