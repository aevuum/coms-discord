import prisma from "../../../database/prisma.js";
import {
  CharacterFaculty,
  CharacterStatus,
} from "../../../database/generated/prisma/client.js";

export class CharacterRepository {
  public static async create(
    userId: string,
    rpName: string,
    avatarUrl: string | null,
    faculty: CharacterFaculty,
  ) {
    return prisma.character.create({
      data: {
        userId,
        rpName,
        avatarUrl,
        faculty,
        balanceKnuts: 0,
      },
    });
  }

  public static async getUserCharacters(userId: string) {
    return prisma.character.findMany({
      where: {
        userId,
      },

      orderBy: {
        createdAt: "asc",
      },
    });
  }

  public static async getById(id: string) {
    return prisma.character.findUnique({
      where: {
        id,
      },
    });
  }

  public static async delete(id: string) {
    return prisma.character.delete({
      where: {
        id,
      },
    });
  }

  public static async updateStatus(id: string, status: CharacterStatus) {
    return prisma.character.update({
      where: {
        id,
      },

      data: {
        status,
      },
    });
  }
}
