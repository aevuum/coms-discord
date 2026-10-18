import prisma from "../../../database/prisma.js";

import type { LocationAccess } from "../../../database/generated/prisma/client.js";

const ROUTES_INCLUDE = {
  routesFrom: {
    include: { to: true },
    orderBy: { createdAt: "asc" },
  },
} as const;

export class LocationRepository {
  public static list(guildId: string) {
    return prisma.location.findMany({
      where: { guildId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  public static listWithRoutes(guildId: string) {
    return prisma.location.findMany({
      where: { guildId },
      include: ROUTES_INCLUDE,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  public static count(guildId: string) {
    return prisma.location.count({ where: { guildId } });
  }

  public static get(guildId: string, id: string) {
    return prisma.location.findFirst({
      where: { guildId, id },
      include: ROUTES_INCLUDE,
    });
  }

  public static findByRole(guildId: string, roleId: string) {
    return prisma.location.findUnique({
      where: { guildId_roleId: { guildId, roleId } },
    });
  }

  public static create(data: {
    guildId: string;
    roleId: string;
    name: string;
    emoji: string | null;
    description: string | null;
    access?: LocationAccess;
    sortOrder: number;
  }) {
    return prisma.location.create({ data });
  }

  public static update(
    id: string,
    data: {
      name?: string;
      emoji?: string | null;
      description?: string | null;
      access?: LocationAccess;
      arrivalChannelId?: string | null;
    },
  ) {
    return prisma.location.update({ where: { id }, data });
  }

  public static async delete(id: string) {
    await prisma.$transaction([
      prisma.travel.deleteMany({ where: { OR: [{ toId: id }, { fromId: id }] } }),
      prisma.location.delete({ where: { id } }),
    ]);
  }

  public static getRoute(id: string) {
    return prisma.locationRoute.findUnique({
      where: { id },
      include: { to: true, from: true },
    });
  }

  public static createRoute(data: {
    fromId: string;
    toId: string;
    method: string;
    travelMinutes: number;
    itemName: string | null;
    itemKey: string | null;
    itemQuantity: number;
    adultOnly: boolean;
  }) {
    return prisma.locationRoute.create({ data });
  }

  public static async deleteRoute(id: string) {
    await prisma.$transaction([
      prisma.travel.deleteMany({ where: { routeId: id } }),
      prisma.locationRoute.delete({ where: { id } }),
    ]);
  }

  public static getSettings(guildId: string) {
    return prisma.locationSettings.upsert({
      where: { guildId },
      update: {},
      create: { guildId },
    });
  }

  public static updateSettings(
    guildId: string,
    data: {
      requestChannelId?: string | null;
      logChannelId?: string | null;
      guideChannelId?: string | null;
      travelRoleId?: string | null;
    },
  ) {
    return prisma.locationSettings.upsert({
      where: { guildId },
      update: data,
      create: { guildId, ...data },
    });
  }
}
