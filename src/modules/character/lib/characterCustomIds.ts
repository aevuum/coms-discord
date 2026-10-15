export enum CharacterPanelAction {
  Root = "root",
  Start = "start",
  Search = "search",
  Member = "member",
  Pick = "pick",
  Confirm = "confirm",
  CreateModal = "create_modal",
  GiveModal = "give_modal",
  TakeSelect = "take_select",
  TakeModal = "take_modal",
  Category = "category",
  ManaModal = "mana_modal",
}

export const CharacterModalFields = {
  Name: "character_name",
  Avatar: "character_avatar",
  Faculty: "character_faculty",
  ItemName: "item_name",
  ItemQuantity: "item_quantity",
  ItemImage: "item_image",
  ManaCurrent: "mana_current",
  ManaMax: "mana_max",
} as const;

export class CharacterCustomIds {
  private static readonly PREFIX = "character";

  public static build(action: CharacterPanelAction, ...args: string[]) {
    return [this.PREFIX, action, ...args].join(":");
  }

  public static parse(customId: string) {
    const parts = customId.split(":");

    if (parts[0] !== this.PREFIX) return null;

    return {
      action: parts[1] as CharacterPanelAction,
      args: parts.slice(2),
    };
  }
}
