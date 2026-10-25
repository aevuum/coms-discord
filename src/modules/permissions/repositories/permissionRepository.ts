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

  public static async renameKeys(mapping: Record<string, string>, onlyIntoEmpty = false) {
    return prisma.$transaction(async (tx) => {
      let moved = 0;

      for (const [from, to] of Object.entries(mapping)) {
        if (onlyIntoEmpty && (await tx.commandPermission.count({ where: { commandName: to } }))) {
          continue;
        }

        const rows = await tx.commandPermission.findMany({
          where: {
            commandName: from,
          },
        });

        if (!rows.length) {
          continue;
        }

        await tx.commandPermission.createMany({
          data: rows.map((row) => ({
            guildId: row.guildId,
            commandName: to,
            roleId: row.roleId,
          })),
          skipDuplicates: true,
        });

        await tx.commandPermission.deleteMany({
          where: {
            commandName: from,
          },
        });

        moved += rows.length;
      }

      return moved;
    });
  }
}
