export enum CharacterPanelAction {
  Root = "root",
  Start = "start",
  Search = "search",
  Member = "member",
  Pick = "pick",
  Player = "player",
  Character = "char",
  Create = "create",
  Act = "act",
  Tab = "tab",
  FamiliarModal = "familiar_modal",
  Confirm = "confirm",
  CreateModal = "create_modal",
  GiveModal = "give_modal",
  TakeSelect = "take_select",
  TakeModal = "take_modal",
  ManaModal = "mana_modal",
  BalanceModal = "balance_modal",
  EditModal = "edit_modal",
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
  Galleons: "galleons",
  Sickles: "sickles",
  Knuts: "knuts",
  Reason: "reason",
  Age: "age",
  SpecialRole: "special_role",
  FamiliarName: "familiar_name",
  FamiliarDescription: "familiar_description",
  FamiliarImage: "familiar_image",
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
