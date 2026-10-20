export type PingRoleSeed = {
  id: string;
  label: string;
  emoji: string;
  description: string;
};

export const PING_ROLES_CHANNEL_ID = "1440142197403156630";

export const PING_ROLES_MAX = 25;

export const PING_ROLE_SEED: PingRoleSeed[] = [
  {
    id: "1442138466136752240",
    label: "Опросы",
    emoji: "〽️",
    description: "Пинг, когда на сервере запускается новый опрос.",
  },
  {
    id: "1442138634202644510",
    label: "Розыгрыши",
    emoji: "🎁",
    description: "Пинг о новых розыгрышах и конкурсах.",
  },
  {
    id: "1442138707795902515",
    label: "Объявления",
    emoji: "📢",
    description: "Пинг о важных новостях и обновлениях сервера.",
  },
];

export const PingRolesCustomIds = {
  select: "ping_roles:select",
  reset: "ping_roles:reset",
} as const;

export enum PingRoleAdminAction {
  Root = "root",
  View = "view",
  AddPage = "add_page",
  AddPick = "add_pick",
  AddModal = "add_modal",
  Edit = "edit",
  EditModal = "edit_modal",
  Up = "up",
  Down = "down",
  Remove = "remove",
  RemoveConfirm = "remove_confirm",
}

export enum PingRoleFields {
  Label = "ping_label",
  Emoji = "ping_emoji",
  Description = "ping_description",
}

const ADMIN_PREFIX = "pingadm";

export class PingRoleAdminIds {
  public static build(action: PingRoleAdminAction, ...args: (string | number)[]) {
    return [ADMIN_PREFIX, action, ...args].join(":");
  }

  public static parse(customId: string) {
    const [prefix, action, ...args] = customId.split(":");

    if (prefix !== ADMIN_PREFIX || !Object.values(PingRoleAdminAction).includes(action as PingRoleAdminAction)) {
      return null;
    }

    return { action: action as PingRoleAdminAction, args };
  }
}
