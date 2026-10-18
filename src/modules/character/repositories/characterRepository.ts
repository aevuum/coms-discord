import prisma from "../../../database/prisma.js";
import {
  CharacterFaculty,
  CharacterStatus,
} from "../../../database/generated/prisma/client.js";
import { Currency } from "../../economy/lib/currency.js";

export class CharacterRepository {
  public static async create(
    userId: string,
    rpName: string,
    avatarUrl: string | null,
    faculty: CharacterFaculty,
    age: number | null,
  ) {
    return prisma.character.create({
      data: {
        userId,
        rpName,
        avatarUrl,
        faculty,
        age,
        balanceKnuts: Currency.START_BALANCE,
      },
    });
  }

  public static async getUserCharacters(userId: string) {
    return prisma.character.findMany({
      where: {
        userId,
      },
      include: {
        user: true,
        tupper: true,
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
      include: {
        user: true,
        tupper: true,
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

  public static async setBalance(
    id: string,
    balanceKnuts: number,
    change: number,
    reason: string | null,
  ) {
    return prisma.$transaction(async (tx) => {
      const character = await tx.character.update({
        where: {
          id,
        },
        data: {
          balanceKnuts,
        },
      });

      if (change !== 0) {
        await tx.characterTransaction.create({
          data: {
            characterId: id,
            type: change > 0 ? "ADMIN_ADD" : "ADMIN_REMOVE",
            amountKnuts: Math.abs(change),
            balanceAfterKnuts: balanceKnuts,
            reason,
          },
        });
      }

      return character;
    });
  }

  public static async updateDetails(
    id: string,
    data: {
      rpName: string;
      age: number | null;
      faculty: CharacterFaculty;
      avatarUrl?: string;
    },
  ) {
    return prisma.character.update({
      where: {
        id,
      },
      data,
    });
  }

  public static async updateMana(id: string, mana: number, maxMana: number) {
    return prisma.character.update({
      where: {
        id,
      },
      data: {
        mana,
        maxMana,
        manaUpdatedAt: new Date(),
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
