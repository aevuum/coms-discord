export enum TravelAction {
  Guide = "guide",
  Route = "route",
  Confirm = "confirm",
  Cancel = "cancel",
  Approve = "approve",
  Reject = "reject",
}

export enum LocationAdminAction {
  Root = "root",
  View = "view",
  Add = "add",
  AddRolePage = "add_role_page",
  AddRole = "add_role",
  CreateModal = "create_modal",
  Edit = "edit",
  EditModal = "edit_modal",
  ToggleAccess = "toggle_access",
  ArrivalPage = "arrival_page",
  Arrival = "arrival",
  ArrivalClear = "arrival_clear",
  RouteAdd = "route_add",
  RouteTarget = "route_target",
  RouteModal = "route_modal",
  RouteDelete = "route_delete",
  RouteRemove = "route_remove",
  Delete = "delete",
  DeleteConfirm = "delete_confirm",
  Settings = "settings",
  SettingsPick = "settings_pick",
  SettingsPage = "settings_page",
  SettingsSet = "settings_set",
  SettingsClear = "settings_clear",
  Move = "move",
  MoveSearch = "move_search",
  MoveMember = "move_member",
  MoveTarget = "move_target",
}

export const LocationModalFields = {
  Name: "name",
  Emoji: "emoji",
  Description: "description",
  Method: "method",
  Minutes: "minutes",
  ItemName: "item_name",
  ItemQuantity: "item_quantity",
  Options: "options",
} as const;

function build(prefix: string, action: string, args: string[]) {
  return [prefix, action, ...args].join(":");
}

function parse<T extends string>(prefix: string, values: T[], customId: string) {
  const [head, action, ...args] = customId.split(":");

  if (head !== prefix || !values.includes(action as T)) {
    return null;
  }

  return { action: action as T, args };
}

export class TravelCustomIds {
  private static readonly PREFIX = "travel";

  public static build(action: TravelAction, ...args: string[]) {
    return build(this.PREFIX, action, args);
  }

  public static parse(customId: string) {
    return parse(this.PREFIX, Object.values(TravelAction), customId);
  }
}

export class LocationCustomIds {
  private static readonly PREFIX = "locadm";

  public static build(action: LocationAdminAction, ...args: string[]) {
    return build(this.PREFIX, action, args);
  }

  public static parse(customId: string) {
    return parse(this.PREFIX, Object.values(LocationAdminAction), customId);
  }
}
