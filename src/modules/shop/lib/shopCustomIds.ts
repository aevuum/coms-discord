export enum ShopAction {
  Home = "home",
  Item = "item",
  Buy = "buy",
}

export enum ShopAdminAction {
  Root = "root",
  Item = "item",
  Create = "create",
  CreateModal = "create_modal",
  Edit = "edit",
  EditModal = "edit_modal",
  Toggle = "toggle",
  Delete = "delete",
  DeleteConfirm = "delete_confirm",
  Inventory = "inv",
  InventorySearch = "inv_search",
  InventoryMember = "inv_member",
  Player = "player",
  Give = "give",
  Take = "take",
}

export const ShopModalFields = {
  Name: "name",
  Emoji: "emoji",
  Description: "description",
  Price: "price",
  Limit: "limit",
} as const;

export class ShopCustomIds {
  public static shop(action: ShopAction, ...args: string[]) {
    return ["shop", action, ...args].join(":");
  }

  public static admin(action: ShopAdminAction, ...args: string[]) {
    return ["shopadm", action, ...args].join(":");
  }

  public static parseShop(customId: string) {
    return this.parse(customId, "shop") as {
      action: ShopAction;
      args: string[];
    } | null;
  }

  public static parseAdmin(customId: string) {
    return this.parse(customId, "shopadm") as {
      action: ShopAdminAction;
      args: string[];
    } | null;
  }

  private static parse(customId: string, prefix: string) {
    const parts = customId.split(":");

    if (parts[0] !== prefix) return null;

    return {
      action: parts[1],
      args: parts.slice(2),
    };
  }
}
