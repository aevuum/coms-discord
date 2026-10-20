import prisma from "../../../database/prisma.js";

export type PingRoleData = {
  label: string;
  emoji: string | null;
  description: string | null;
};

export class PingRoleRepository {
  public static list(guildId: string) {
    return prisma.pingRole.findMany({
      where: { guildId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  public static count(guildId: string) {
    return prisma.pingRole.count({ where: { guildId } });
  }

  public static find(roleId: string) {
    return prisma.pingRole.findUnique({ where: { roleId } });
  }

  public static async create(guildId: string, roleId: string, data: PingRoleData) {
    const last = await prisma.pingRole.findFirst({
      where: { guildId },
      orderBy: { sortOrder: "desc" },
    });

    return prisma.pingRole.create({
      data: { guildId, roleId, ...data, sortOrder: (last?.sortOrder ?? -1) + 1 },
    });
  }

  public static createMany(guildId: string, roles: ({ roleId: string } & PingRoleData)[]) {
    return prisma.pingRole.createMany({
      data: roles.map((role, index) => ({ guildId, ...role, sortOrder: index })),
      skipDuplicates: true,
    });
  }

  public static update(roleId: string, data: PingRoleData) {
    return prisma.pingRole.update({ where: { roleId }, data });
  }

  public static delete(roleId: string) {
    return prisma.pingRole.deleteMany({ where: { roleId } });
  }

  public static reorder(roleIds: string[]) {
    return prisma.$transaction(
      roleIds.map((roleId, index) =>
        prisma.pingRole.update({ where: { roleId }, data: { sortOrder: index } }),
      ),
    );
  }
}
