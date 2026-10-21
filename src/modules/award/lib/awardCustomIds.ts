export enum AwardAction {
  Root = "root",
  Create = "create",
  CreateModal = "create_modal",
  Delete = "delete",
  DeleteSelect = "delete_select",
  DeleteConfirm = "delete_confirm",
  Player = "player",
  PlayerSearch = "player_search",
  PlayerMember = "player_member",
  GiveAward = "give_award",
  TakeAward = "take_award",
}

export const AwardModalFields = {
  Label: "label",
  Emoji: "emoji",
  Coins: "coins",
  Description: "description",
  Rarity: "rarity",
} as const;

export class AwardCustomIds {
  private static readonly PREFIX = "award";

  public static build(action: AwardAction, ...args: string[]) {
    return [this.PREFIX, action, ...args].join(":");
  }

  public static parse(customId: string) {
    const parts = customId.split(":");

    if (parts[0] !== this.PREFIX) return null;

    return {
      action: parts[1] as AwardAction,
      args: parts.slice(2),
    };
  }
}
