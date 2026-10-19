export enum GiveawayAdminAction {
  Root = "root",
  Create = "create",
  CreateModal = "create_modal",
  View = "view",
  End = "end",
  Cancel = "cancel",
  CancelConfirm = "cancel_confirm",
  Reroll = "reroll",
  Settings = "settings",
  ChannelPage = "channel_page",
  ChannelSet = "channel_set",
  RolePage = "role_page",
  RoleSet = "role_set",
  RoleClear = "role_clear",
}

const ADMIN_PREFIX = "gwadmin";
const JOIN_PREFIX = "giveaway:join";

export class GiveawayCustomIds {
  public static join(giveawayId: string) {
    return `${JOIN_PREFIX}:${giveawayId}`;
  }

  public static parseJoin(customId: string) {
    return customId.startsWith(`${JOIN_PREFIX}:`) ? customId.slice(JOIN_PREFIX.length + 1) : null;
  }

  public static admin(action: GiveawayAdminAction, ...args: (string | number)[]) {
    return [ADMIN_PREFIX, action, ...args].join(":");
  }

  public static parseAdmin(customId: string) {
    const [prefix, action, ...args] = customId.split(":");

    if (prefix !== ADMIN_PREFIX || !Object.values(GiveawayAdminAction).includes(action as GiveawayAdminAction)) {
      return null;
    }

    return { action: action as GiveawayAdminAction, args };
  }
}

export enum GiveawayModalFields {
  Prize = "giveaway_prize",
  Description = "giveaway_description",
  Winners = "giveaway_winners",
  Duration = "giveaway_duration",
  Image = "giveaway_image",
}
