import prisma from "../../../database/prisma.js";

export class PermissionRepository {
  public static async getGuildPermissions(guildId: string) {
    return prisma.commandPermission.findMany({
      where: {
        guildId,
      },

      orderBy: {
        createdAt: "asc",
      },
    });
  }

  public static async setRoles(
    guildId: string,
    commandName: string,
    roleIds: string[],
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.commandPermission.deleteMany({
        where: {
          guildId,
          commandName,
        },
      });

      if (roleIds.length) {
        await tx.commandPermission.createMany({
          data: roleIds.map((roleId) => ({
            guildId,
            commandName,
            roleId,
          })),
        });
      }
    });
  }
}
