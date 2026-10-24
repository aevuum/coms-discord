export enum RuneAdminAction {
  Root = "root",
  Section = "section",
  Request = "req",
  RequestApprove = "req_ok",
  RequestApproveModal = "req_ok_m",
  RequestReject = "req_no",
  RequestRejectModal = "req_no_m",
  Formula = "f",
  FormulaCreate = "f_new",
  FormulaCreateModal = "f_new_m",
  FormulaEdit = "f_edit",
  FormulaEditModal = "f_edit_m",
  FormulaApprove = "f_ok",
  FormulaApproveModal = "f_ok_m",
  FormulaReject = "f_no",
  FormulaRejectModal = "f_no_m",
  FormulaToggle = "f_toggle",
  Recipe = "r",
  RecipeCreate = "r_new",
  RecipeEdit = "r_edit",
  RecipeSaveModal = "r_save_m",
  RecipeApprove = "r_ok",
  RecipeApproveModal = "r_ok_m",
  RecipeReject = "r_no",
  RecipeRejectModal = "r_no_m",
  RecipeToggle = "r_toggle",
  Rune = "rune",
  RuneText = "rune_text",
  RuneTextModal = "rune_text_m",
  RuneMeta = "rune_meta",
  RuneMetaModal = "rune_meta_m",
  Material = "m",
  MaterialCreate = "m_new",
  MaterialEdit = "m_edit",
  MaterialSaveModal = "m_save_m",
  MaterialDelete = "m_del",
  Blank = "b",
  BlankCreate = "b_new",
  BlankEdit = "b_edit",
  BlankSaveModal = "b_save_m",
  BlankDelete = "b_del",
  SettingsEdit = "settings",
  SettingsModal = "settings_m",
}

export enum RuneAdminSection {
  Requests = "requests",
  Formulas = "formulas",
  Recipes = "recipes",
  Runes = "runes",
  Materials = "materials",
  Blanks = "blanks",
  Settings = "settings",
  History = "history",
}

export const RuneAdminFields = {
  Mastery: "mastery",
  Reason: "reason",
  Spell: "spell",
  Rune: "rune",
  Incantation: "incantation",
  Effect: "effect",
  Mechanics: "mechanics",
  Restrictions: "restrictions",
  MinMastery: "min_mastery",
  BaseRisk: "base_risk",
  Complexity: "complexity",
  FailureOutcome: "failure_outcome",
  OverloadOutcome: "overload_outcome",
  Name: "name",
  Blank: "blank",
  Runes: "runes",
  Materials: "materials",
  Domain: "domain",
  Principle: "principle",
  Modifies: "modifies",
  SpellUse: "spell_use",
  ArtifactUse: "artifact_use",
  Meaning: "meaning",
  Load: "load",
  Description: "description",
  CapacityBonus: "capacity_bonus",
  Kind: "kind",
  BaseCapacity: "base_capacity",
  Quality: "quality",
  ElderLoad: "elder_load",
  YoungerLoad: "younger_load",
  Reduction: "reduction",
  RiskBounds: "risk_bounds",
  Defaults: "defaults",
} as const;

export class RuneAdminCustomIds {
  private static readonly PREFIX = "runeadm";

  public static build(action: RuneAdminAction, ...args: string[]) {
    return [this.PREFIX, action, ...args].join(":");
  }

  public static parse(customId: string) {
    const parts = customId.split(":");

    if (parts[0] !== this.PREFIX) return null;

    return { action: parts[1] as RuneAdminAction, args: parts.slice(2) };
  }
}
