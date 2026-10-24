import {
  Prisma,
  RuneAuditAction,
  RuneRequestStatus,
  type Rune,
} from "../../../database/generated/prisma/client.js";

import prisma from "../../../database/prisma.js";
import { CharacterRepository } from "../../character/repositories/characterRepository.js";
import { CharacterService } from "../../character/service/characterService.js";
import { RUNE_MAX_MASTERY } from "../lib/runeCatalog.js";
import { RuneRules } from "../lib/runeRules.js";
import { RuneAudit } from "./runeAudit.js";
import { RuneError, RuneRegistry } from "./runeRegistry.js";

export { RuneError };

export type LearnedRune = {
  rune: Rune;
  mastery: number;
  learnedAt: Date;
};

export class RuneService {
  public static getCharacters(discordId: string) {
    return CharacterService.getCharacters(discordId);
  }

  public static async getOwnedCharacter(discordId: string, characterId: string) {
    const character = await CharacterRepository.getById(characterId);

    if (!character || character.user.discordId !== discordId) {
      throw new RuneError("Персонаж не найден.");
    }

    return character;
  }

  public static async getCharacter(characterId: string) {
    const character = await CharacterRepository.getById(characterId);

    if (!character) {
      throw new RuneError("Персонаж не найден.");
    }

    return character;
  }

  public static async learned(characterId: string): Promise<LearnedRune[]> {
    const [runes, records] = await Promise.all([
      RuneRegistry.all(),
      prisma.characterRune.findMany({ where: { characterId } }),
    ]);

    return runes.flatMap((rune) => {
      const record = records.find((entry) => entry.runeKey === rune.key);

      return record ? [{ rune, mastery: record.mastery, learnedAt: record.learnedAt }] : [];
    });
  }

  public static async mastery(characterId: string, runeKey: string) {
    const record = await prisma.characterRune.findUnique({
      where: { characterId_runeKey: { characterId, runeKey } },
    });

    return record?.mastery ?? null;
  }

  public static async requestStudy(
    discordId: string,
    characterId: string,
    runeKey: string,
    postInput: string,
    noteInput: string,
  ) {
    const character = await this.getOwnedCharacter(discordId, characterId);
    const rune = await RuneRegistry.get(runeKey);

    const postUrl = postInput.trim();

    if (!/^https:\/\/(ptb\.|canary\.)?discord(app)?\.com\/channels\/\d+\/\d+\/\d+$/.test(postUrl)) {
      throw new RuneError("Укажите ссылку на RP-пост в Discord: ПКМ по сообщению → «Копировать ссылку на сообщение».");
    }

    if ((await this.mastery(character.id, rune.key)) !== null) {
      throw new RuneError(`Руна ${rune.name} уже изучена персонажем.`);
    }

    return prisma.$transaction(async (tx) => {
      const pending = await tx.runeStudyRequest.findFirst({
        where: { characterId: character.id, runeKey: rune.key, status: RuneRequestStatus.PENDING },
      });

      if (pending) {
        throw new RuneError(`Заявка на изучение руны ${rune.name} уже ждёт решения куратора.`);
      }

      const request = await tx.runeStudyRequest.create({
        data: {
          characterId: character.id,
          runeKey: rune.key,
          postUrl,
          note: noteInput.trim().slice(0, 500) || null,
        },
      });

      await RuneAudit.write(
        { action: RuneAuditAction.STUDY_REQUESTED, actorId: discordId, characterId: character.id, runeKey: rune.key },
        tx,
      );

      return { request, rune };
    });
  }

  public static pendingRequests() {
    return prisma.runeStudyRequest.findMany({
      where: { status: RuneRequestStatus.PENDING },
      orderBy: { createdAt: "asc" },
      take: 25,
      include: { rune: true, character: { include: { user: true } } },
    });
  }

  public static characterRequests(characterId: string) {
    return prisma.runeStudyRequest.findMany({
      where: { characterId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { rune: true },
    });
  }

  public static async getRequest(id: string) {
    const request = await prisma.runeStudyRequest.findUnique({
      where: { id },
      include: { rune: true, character: { include: { user: true } } },
    });

    if (!request) {
      throw new RuneError("Заявка не найдена.");
    }

    return request;
  }

  public static async approveRequest(id: string, reviewerId: string, masteryInput: string) {
    const settings = await RuneRegistry.getSettings();
    const mastery = masteryInput.trim() ? RuneRules.parseMastery(masteryInput) : settings.defaultInitialMastery;

    if (mastery === null) {
      throw new RuneError(`Начальное владение должно быть числом от 0 до ${RUNE_MAX_MASTERY}.`);
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const claimed = await tx.runeStudyRequest.updateMany({
          where: { id, status: RuneRequestStatus.PENDING },
          data: { status: RuneRequestStatus.APPROVED, reviewerId, reviewedAt: new Date() },
        });

        if (!claimed.count) {
          throw new RuneError("Заявка уже рассмотрена.");
        }

        const request = await tx.runeStudyRequest.findUniqueOrThrow({ where: { id }, include: { rune: true } });

        await tx.characterRune.create({
          data: { characterId: request.characterId, runeKey: request.runeKey, mastery, confirmedById: reviewerId },
        });

        await RuneAudit.write(
          {
            action: RuneAuditAction.RUNE_LEARNED,
            actorId: reviewerId,
            characterId: request.characterId,
            runeKey: request.runeKey,
            toValue: mastery,
            note: request.postUrl,
          },
          tx,
        );

        return { request, mastery };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new RuneError("Персонаж уже изучил эту руну.");
      }

      throw error;
    }
  }

  public static async rejectRequest(id: string, reviewerId: string, reasonInput: string) {
    const reason = reasonInput.trim();

    if (reason.length < 3) {
      throw new RuneError("Укажите причину отказа.");
    }

    return prisma.$transaction(async (tx) => {
      const claimed = await tx.runeStudyRequest.updateMany({
        where: { id, status: RuneRequestStatus.PENDING },
        data: { status: RuneRequestStatus.REJECTED, reviewerId, reason: reason.slice(0, 500), reviewedAt: new Date() },
      });

      if (!claimed.count) {
        throw new RuneError("Заявка уже рассмотрена.");
      }

      const request = await tx.runeStudyRequest.findUniqueOrThrow({ where: { id }, include: { rune: true } });

      await RuneAudit.write(
        {
          action: RuneAuditAction.STUDY_REJECTED,
          actorId: reviewerId,
          characterId: request.characterId,
          runeKey: request.runeKey,
          note: reason,
        },
        tx,
      );

      return request;
    });
  }

  public static async setMastery(characterId: string, runeKey: string, input: string, actorId: string) {
    const rune = await RuneRegistry.get(runeKey);
    const text = input.trim();

    return prisma.$transaction(async (tx) => {
      const current = await tx.characterRune.findUnique({
        where: { characterId_runeKey: { characterId, runeKey } },
      });

      if (!text) {
        if (current) {
          await tx.characterRune.delete({ where: { id: current.id } });
          await RuneAudit.write(
            { action: RuneAuditAction.RUNE_FORGOTTEN, actorId, characterId, runeKey, fromValue: current.mastery },
            tx,
          );
        }

        return { rune, mastery: null };
      }

      const mastery = RuneRules.parseMastery(text);

      if (mastery === null) {
        throw new RuneError(`Владение должно быть целым числом от 0 до ${RUNE_MAX_MASTERY}.`);
      }

      if (!current) {
        await tx.characterRune.create({ data: { characterId, runeKey, mastery, confirmedById: actorId } });
        await RuneAudit.write(
          { action: RuneAuditAction.RUNE_LEARNED, actorId, characterId, runeKey, toValue: mastery, note: "Подтверждено куратором напрямую" },
          tx,
        );

        return { rune, mastery };
      }

      if (current.mastery !== mastery) {
        await tx.characterRune.update({ where: { id: current.id }, data: { mastery } });
        await RuneAudit.write(
          { action: RuneAuditAction.MASTERY_CHANGED, actorId, characterId, runeKey, fromValue: current.mastery, toValue: mastery },
          tx,
        );
      }

      return { rune, mastery };
    });
  }
}
