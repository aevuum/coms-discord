import { CommandAccess } from "../../permissions/types/permissions.js";
import { ManageSectionId, type ManageSection } from "../types/manage.js";

export const MANAGE_SECTIONS: ManageSection[] = [
  {
    id: ManageSectionId.Awards,
    key: "manage.awards",
    label: "Награды",
    emoji: "<:972712donator:1518581051960852601>",
    description: "Создание, выдача и снятие наград",
    access: CommandAccess.Restricted,
  },
  {
    id: ManageSectionId.Characters,
    key: "manage.characters",
    label: "Персонажи",
    emoji: "<:928205membericon:1518581050555633674>",
    description: "Создание, удаление, заморозка и смерть персонажей",
    access: CommandAccess.Restricted,
  },
  {
    id: ManageSectionId.Spells,
    key: "manage.spells",
    label: "Заклинания",
    emoji: "<:515636magicwandids:1519585028596563968>",
    description: "Создание, изменение и удаление заклинаний",
    access: CommandAccess.Restricted,
  },
  {
    id: ManageSectionId.Shop,
    key: "manage.shop",
    label: "Магазин",
    emoji: "<:16874shopcyan:1518587268154134569>",
    description: "Товары за комс-коины и инвентари игроков",
    access: CommandAccess.Restricted,
  },
  {
    id: ManageSectionId.Coins,
    key: "manage.coins",
    label: "Комс-коины",
    emoji: "<:4197emeraldrankicon:1518587243143368835>",
    description: "Еженедельные начисления по ролям и балансы игроков",
    access: CommandAccess.Restricted,
  },
  {
    id: ManageSectionId.Locations,
    key: "manage.locations",
    label: "Локации",
    emoji: "<:3124journeys:1518587239276478546>",
    description: "Места, пути между ними, доступ и заявки на перемещение",
    access: CommandAccess.Restricted,
  },
  {
    id: ManageSectionId.Permissions,
    key: "manage.permissions",
    label: "Доступ",
    emoji: "<:72943adminhexagon:1518587307945492480>",
    description: "Роли, которым доступны команды и разделы управления",
    access: CommandAccess.Admin,
  },
];

export const LEGACY_PERMISSION_KEYS: Record<string, string> = {
  award: "manage.awards",
  "manage-character": "manage.characters",
  spells: "manage.spells",
};

export function getManageSection(id: string) {
  return MANAGE_SECTIONS.find((section) => section.id === id) ?? null;
}
