export type PingRole = {
  id: string;
  label: string;
  emoji: string;
  description: string;
};

export const PING_ROLES_CHANNEL_ID = "1440142197403156630";

export const PING_ROLES: PingRole[] = [
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
