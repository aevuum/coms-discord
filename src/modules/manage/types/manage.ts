import type { CommandAccess } from "../../permissions/types/permissions.js";

export enum ManageSectionId {
  Awards = "awards",
  Characters = "characters",
  Spells = "spells",
  Shop = "shop",
  Coins = "coins",
  Locations = "locations",
  Rolls = "rolls",
  Applications = "applications",
  Reports = "reports",
  Giveaways = "giveaways",
  PingRoles = "pingroles",
  Permissions = "permissions",
  Runes = "runes",
}

export type ManageSection = {
  id: ManageSectionId;
  key: string;
  label: string;
  emoji: string;
  description: string;
  access: CommandAccess;
};

export type MemberOption = {
  id: string;
  displayName: string;
  username: string;
};
