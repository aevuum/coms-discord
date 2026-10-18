import type {
  Location,
  LocationRoute,
  LocationSettings,
  Travel,
} from "../../../database/generated/prisma/client.js";

export class LocationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "LocationError";
  }
}

export type RouteWithTarget = LocationRoute & {
  to: Location;
};

export type LocationWithRoutes = Location & {
  routesFrom: RouteWithTarget[];
};

export type GuideView = {
  current: Location | null;
  routes: RouteWithTarget[];
  locations: Location[];
  travel: (Travel & { to: Location | null }) | null;
};

export type TravelPlan = {
  route: RouteWithTarget;
  from: Location | null;
  payer: { characterId: string; characterName: string; itemId: string } | null;
};

export type SettingsView = LocationSettings & {
  requestChannelName: string | null;
  logChannelName: string | null;
  guideChannelName: string | null;
  travelRoleName: string | null;
};

export type ChannelOption = {
  id: string;
  name: string;
};

export type ChannelPage = {
  channels: ChannelOption[];
  page: number;
  totalPages: number;
};

export enum SettingsField {
  Request = "request",
  Log = "log",
  Guide = "guide",
  TravelRole = "travel_role",
}
