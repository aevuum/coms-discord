export enum RollAdminAction {
  Root = "root",
  Kind = "kind",
  View = "view",
  Add = "add",
  CreateModal = "create_modal",
  Edit = "edit",
  EditModal = "edit_modal",
  Delete = "delete",
  DeleteConfirm = "delete_confirm",
}

export const RollModalFields = {
  Name: "name",
  Emoji: "emoji",
  Description: "description",
  ImageUrl: "image_url",
  Chance: "chance",
} as const;

export const LEGACY_RACE_REROLL = "race:reroll";

export class RollCustomIds {
  public static reroll(slug: string) {
    return `roll:reroll:${slug}`;
  }

  public static parseReroll(customId: string) {
    if (customId === LEGACY_RACE_REROLL) {
      return "race";
    }

    const [prefix, action, slug] = customId.split(":");

    return prefix === "roll" && action === "reroll" && slug ? slug : null;
  }

  public static admin(action: RollAdminAction, ...args: string[]) {
    return ["rolladm", action, ...args].join(":");
  }

  public static parseAdmin(customId: string) {
    const [prefix, action, ...args] = customId.split(":");

    if (prefix !== "rolladm" || !Object.values(RollAdminAction).includes(action as RollAdminAction)) {
      return null;
    }

    return { action: action as RollAdminAction, args };
  }
}
