import type { LocationAccess } from "../../../database/generated/prisma/client.js";

export type SeedLocation = {
  key: string;
  roleId: string;
  name: string;
  emoji: string;
  description: string;
  access: LocationAccess;
};

export type SeedRoute = {
  from: string;
  to: string;
  method: string;
  travelMinutes: number;
  itemName?: string;
  itemQuantity?: number;
  adultOnly?: boolean;
};

export const SEED_LOCATIONS: SeedLocation[] = [
  {
    key: "hogwarts",
    roleId: "1440691339724329022",
    name: "Хогвартс",
    emoji: "🏰",
    description: "Школа чародейства и волшебства. Вход для посторонних только с разрешения.",
    access: "APPROVAL",
  },
  {
    key: "hogsmeade",
    roleId: "1440691075500085368",
    name: "Хогсмид",
    emoji: "🛖",
    description: "Единственная полностью волшебная деревня Британии неподалёку от Хогвартса.",
    access: "OPEN",
  },
  {
    key: "london",
    roleId: "1442998067392413887",
    name: "Лондон",
    emoji: "🏤",
    description: "Столица, где магический мир прячется среди магглов: Косой переулок, Лютный и не только.",
    access: "OPEN",
  },
  {
    key: "ministry",
    roleId: "1442998210099679383",
    name: "Министерство",
    emoji: "🔮",
    description: "Министерство магии. Аппарация внутрь запрещена, посетителей пропускают по разрешению.",
    access: "APPROVAL",
  },
];

const FLOO_POWDER = "Летучий порох";

export const SEED_ROUTES: SeedRoute[] = [
  { from: "hogsmeade", to: "hogwarts", method: "Пешком", travelMinutes: 10 },
  { from: "hogwarts", to: "hogsmeade", method: "Пешком", travelMinutes: 10 },
  { from: "hogsmeade", to: "london", method: "Камин", travelMinutes: 0, itemName: FLOO_POWDER },
  { from: "london", to: "hogsmeade", method: "Камин", travelMinutes: 0, itemName: FLOO_POWDER },
  { from: "hogsmeade", to: "london", method: "Аппарация", travelMinutes: 0, adultOnly: true },
  { from: "london", to: "hogsmeade", method: "Аппарация", travelMinutes: 0, adultOnly: true },
  { from: "london", to: "ministry", method: "Вход для посетителей", travelMinutes: 5 },
  { from: "london", to: "ministry", method: "Камин", travelMinutes: 0, itemName: FLOO_POWDER },
  { from: "ministry", to: "london", method: "Камин", travelMinutes: 0, itemName: FLOO_POWDER },
  { from: "ministry", to: "london", method: "Выход для посетителей", travelMinutes: 5 },
];
