import { SpellMode } from "../types/spells.js";

export enum SpellAction {
  Page = "page",
  Select = "select",
  Open = "open",
  Create = "create",
  CreateModal = "create_modal",
  Edit = "edit",
  EditModal = "edit_modal",
  Description = "description",
  DescriptionModal = "description_modal",
  Delete = "delete",
  DeleteConfirm = "delete_confirm",
}

export const SpellModalFields = {
  Name: "name",
  Incantations: "incantations",
  Difficulty: "difficulty",
  ManaCost: "mana_cost",
  ImageUrl: "image_url",
  Description: "description",
} as const;

export class SpellCustomIds {
  private static readonly PREFIX = "spells";

  public static page(mode: SpellMode, page: number) {
    return `${this.PREFIX}:${mode}:${SpellAction.Page}:${page}`;
  }

  public static select(mode: SpellMode, page: number) {
    return `${this.PREFIX}:${mode}:${SpellAction.Select}:${page}`;
  }

  public static open(mode: SpellMode, spellId: string, page: number) {
    return `${this.PREFIX}:${mode}:${SpellAction.Open}:${spellId}:${page}`;
  }

  public static create() {
    return `${this.PREFIX}:${SpellMode.Manage}:${SpellAction.Create}`;
  }

  public static createModal() {
    return `${this.PREFIX}:${SpellMode.Manage}:${SpellAction.CreateModal}`;
  }

  public static edit(spellId: string, page: number) {
    return `${this.PREFIX}:${SpellMode.Manage}:${SpellAction.Edit}:${spellId}:${page}`;
  }

  public static editModal(spellId: string, page: number) {
    return `${this.PREFIX}:${SpellMode.Manage}:${SpellAction.EditModal}:${spellId}:${page}`;
  }

  public static description(spellId: string, page: number) {
    return `${this.PREFIX}:${SpellMode.Manage}:${SpellAction.Description}:${spellId}:${page}`;
  }

  public static descriptionModal(spellId: string, page: number) {
    return `${this.PREFIX}:${SpellMode.Manage}:${SpellAction.DescriptionModal}:${spellId}:${page}`;
  }

  public static delete(spellId: string, page: number) {
    return `${this.PREFIX}:${SpellMode.Manage}:${SpellAction.Delete}:${spellId}:${page}`;
  }

  public static deleteConfirm(spellId: string, page: number) {
    return `${this.PREFIX}:${SpellMode.Manage}:${SpellAction.DeleteConfirm}:${spellId}:${page}`;
  }

  public static parse(customId: string) {
    const parts = customId.split(":");

    if (parts[0] !== this.PREFIX) return null;

    const mode = parts[1] === SpellMode.Manage ? SpellMode.Manage : SpellMode.View;

    return {
      mode,
      action: parts[2] as SpellAction,
      args: parts.slice(3),
    };
  }
}
