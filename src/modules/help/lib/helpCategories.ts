import type { HelpCategoryDefinition } from "../types/help.js";

export const HELP_CATEGORIES: HelpCategoryDefinition[] = [
  {
    id: "general",
    label: "Основные",
    emoji: "<:423717discordcamp:1518587355068497950>",
    description: "Профиль, статистика и общие команды.",
    modules: ["help", "users", "global", "shop", "activity", "reports"],
  },
  {
    id: "roleplay",
    label: "Ролеплей",
    emoji: "<:515636magicwandids:1519585028596563968>",
    description: "Персонажи, экономика, заклинания и игровые механики.",
    modules: ["economy", "rolls", "tupper", "spells", "locations"],
  },
  {
    id: "admin",
    label: "Администрирование",
    emoji: "<:563621mod8:1518587360886128661>",
    description: "Управление персонажами, наградами и доступом к командам.",
    modules: ["manage", "character", "award", "permissions"],
  },
];

export const HELP_FALLBACK_CATEGORY: HelpCategoryDefinition = {
  id: "other",
  label: "Прочее",
  emoji: "<:1821serversfolder:1518587234163622040>",
  description: "Команды без категории.",
  modules: [],
};
