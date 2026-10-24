export enum RuneAction {
  Pick = "pick",
  Back = "back",
  Tab = "tab",
  Page = "page",
  Info = "info",
  Study = "study",
  StudyModal = "study_modal",
  Formula = "formula",
}

export enum RuneTab {
  Runes = "runes",
  Catalog = "catalog",
  Formulas = "formulas",
  Requests = "requests",
}

export const RuneModalFields = {
  PostUrl: "post_url",
  Note: "note",
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
