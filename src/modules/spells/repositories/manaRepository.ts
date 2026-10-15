import prisma from "../../../database/prisma.js";

import type { ManaState } from "../types/spells.js";

export type CastRecord = {
  spellId: string;
  spellName: string;
  manaCost: number;
};

export class ManaRepository {
  public static async getCharacter(characterId: string) {
    return prisma.character.findUnique({
      where: {
        id: characterId,
      },

      select: {
        id: true,
        rpName: true,
        mana: true,
        maxMana: true,
        manaUpdatedAt: true,
      },
    });
  }

  public static async applyCast(
    characterId: string,
    expected: ManaState,
    next: ManaState,
    currentMana: number,
    casts: CastRecord[],
    channelId: string,
    messageId: string | null,
  ) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.character.updateMany({
        where: {
          id: characterId,
          mana: expected.mana,
          manaUpdatedAt: expected.manaUpdatedAt,
        },

        data: {
          mana: next.mana,
          manaUpdatedAt: next.manaUpdatedAt,
        },
      });

      if (updated.count === 0) {
        return false;
      }

      let manaAfter = currentMana;

      await tx.spellCast.createMany({
        data: casts.map((cast) => {
          manaAfter -= cast.manaCost;

          return {
            characterId,
            spellId: cast.spellId,
            spellName: cast.spellName,
            manaCost: cast.manaCost,
            manaAfter,
            channelId,
            messageId,
          };
        }),
      });

      return true;
    });
  }
}
