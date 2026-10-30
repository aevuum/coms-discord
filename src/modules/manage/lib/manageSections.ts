import { CommandAccess } from "../../permissions/types/permissions.js";
import { ManageSectionId, type ManageSection } from "../types/manage.js";

export const MANAGE_SECTIONS: ManageSection[] = [
  {
    id: ManageSectionId.Awards,
    key: "manage.awards",
    label: "Награды",
    emoji: "<:sec_rewards:1562521791329468467>",
    description: "Создание, выдача и снятие наград",
    access: CommandAccess.Restricted,
  },
  {
    id: ManageSectionId.Characters,
    key: "manage.characters",
    label: "Персонажи",
    emoji: "<:sec_characters:1562521773789155450>",
    description: "Создание, удаление, заморозка и смерть персонажей",
    access: CommandAccess.Restricted,
  },
  {
    id: ManageSectionId.Spells,
    key: "manage.spells",
    label: "Заклинания",
    emoji: "<:sec_spells:1562521795972567140>",
    description: "Создание, изменение и удаление заклинаний",
    access: CommandAccess.Restricted,
  },
  {
    id: ManageSectionId.Shop,
    key: "manage.shop",
    label: "Магазин",
    emoji: "<:sec_shop:1562521793691131955>",
    description: "Товары за комс-коины и инвентари игроков",
    access: CommandAccess.Restricted,
  },
  {
    id: ManageSectionId.Coins,
    key: "manage.coins",
    label: "Комс-коины",
    emoji: "<:coms_coin:1562521767837306900>",
    description: "Еженедельные начисления по ролям и балансы игроков",
    access: CommandAccess.Restricted,
  },
  {
    id: ManageSectionId.Locations,
    key: "manage.locations",
    label: "Локации",
    emoji: "<:sec_locations:1562521782680952994>",
    description: "Места, пути между ними, доступ и заявки на перемещение",
    access: CommandAccess.Restricted,
  },
  {
    id: ManageSectionId.Rolls,
    key: "manage.rolls",
    label: "Расы и трейты",
    emoji: "<:sec_races:1562521787571634256>",
    description: "Что может выпасть по /race и /trait и с каким шансом",
    access: CommandAccess.Restricted,
  },
  {
    id: ManageSectionId.Runes,
    key: "manage.runes",
    label: "Руны и артефакты",
    emoji: "<:elder_ansuz:1562468430295334952>",
    description: "Заявки на изучение, формулы заклинаний, рецепты артефактов",
    access: CommandAccess.Restricted,
  },
  {
    id: ManageSectionId.Schedule,
    key: "manage.schedule",
    label: "Расписание",
    emoji: "<:scroll:1562262856039145553>",
    description: "Утверждение занятий преподавателей, предметы и напоминания",
    access: CommandAccess.Restricted,
  },
  {
    id: ManageSectionId.Points,
    key: "manage.points",
    label: "Очки факультетов",
    emoji: "<:sec_rewards:1562521791329468467>",
    description: "Песочные часы факультетов, ручные начисления и обнуление",
    access: CommandAccess.Restricted,
  },
  {
    id: ManageSectionId.Halloween,
    key: "manage.halloween",
    label: "Хэллоуин",
    emoji: "🎃",
    description: "Тыквы «Магия или жизнь», конфеты, лавка и курс обмена",
    access: CommandAccess.Restricted,
  },
  {
    id: ManageSectionId.Applications,
    key: "manage.applications",
    label: "Набор в команду",
    emoji: "<:sec_recruit:1562521789559476344>",
    description: "Открытие и закрытие набора на стафф-роли, пункты анкеты",
    access: CommandAccess.Restricted,
  },
  {
    id: ManageSectionId.Giveaways,
    key: "manage.giveaways",
    label: "Розыгрыши",
    emoji: "<:sec_giveaway:1562521778125799554>",
    description: "Создание розыгрышей, итоги и перевыбор победителей",
    access: CommandAccess.Restricted,
  },
  {
    id: ManageSectionId.PingRoles,
    key: "manage.pingroles",
    label: "Пинг-роли",
    emoji: "<:sec_ping:1562521785537138839>",
    description: "Роли на панели уведомлений, которые участники выбирают сами",
    access: CommandAccess.Restricted,
  },
  {
    id: ManageSectionId.Reports,
    key: "manage.reports",
    label: "Жалобы",
    emoji: "<:sec_complaints:1562521776020258826>",
    description: "Роли, которые могут рассматривать жалобы участников",
    access: CommandAccess.Admin,
  },
  {
    id: ManageSectionId.Permissions,
    key: "manage.permissions",
    label: "Доступ",
    emoji: "<:sec_access:1562521769946906696>",
    description: "Роли, которым доступны команды и разделы управления",
    access: CommandAccess.Admin,
  },
];

export const EXTRA_PERMISSION_TARGETS = [
  {
    key: "schedule.teach",
    label: "Преподавание",
    description: "Создание занятий, оценки и посещаемость в /schedule",
    access: CommandAccess.Restricted,
  },
  {
    key: "points.award",
    label: "Очки факультетов",
    description: "Сообщения вида «+10 Гриффиндор» меняют очки факультетов",
    access: CommandAccess.Restricted,
  },
];

export const MOVED_PERMISSION_KEYS: Record<string, string> = {
  schedule: "schedule.teach",
};

export const LEGACY_PERMISSION_KEYS: Record<string, string> = {
  award: "manage.awards",
  "manage-character": "manage.characters",
  spells: "manage.spells",
};

export function getManageSection(id: string) {
  return MANAGE_SECTIONS.find((section) => section.id === id) ?? null;
}
