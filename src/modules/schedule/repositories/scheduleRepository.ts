import { CharacterFaculty, CharacterStatus } from "../../../database/generated/prisma/client.js";

import prisma from "../../../database/prisma.js";
import { ScheduleError } from "../types/schedule.js";

export class ScheduleRepository {
  public static subjects(includeInactive = false) {
    return prisma.subject.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      take: 25,
    });
  }

  public static subject(id: string) {
    return prisma.subject.findUnique({ where: { id } });
  }

  public static createSubject(data: { name: string; emoji: string | null; sortOrder: number }) {
    return prisma.subject.create({ data });
  }

  public static updateSubject(id: string, data: { name?: string; emoji?: string | null; sortOrder?: number; active?: boolean }) {
    return prisma.subject.update({ where: { id }, data });
  }

  public static settings(guildId: string) {
    return prisma.scheduleSettings.findUnique({ where: { guildId } });
  }

  public static allSettings() {
    return prisma.scheduleSettings.findMany();
  }

  public static saveSettings(
    guildId: string,
    data: { reviewChannelId?: string | null; reminderMinutes?: number; gradesChannelId?: string | null; gradesMessageId?: string | null },
  ) {
    return prisma.scheduleSettings.upsert({
      where: { guildId },
      create: { guildId, ...data },
      update: data,
    });
  }

  public static ownCharacters(discordId: string) {
    return prisma.character.findMany({
      where: { user: { discordId }, status: CharacterStatus.ALIVE },
      orderBy: { createdAt: "asc" },
      take: 25,
    });
  }

  public static async studentCharacters(discordId: string) {
    const characters = await this.ownCharacters(discordId);

    return {
      students: characters.filter((character) => character.faculty !== CharacterFaculty.ADULT),
      adults: characters.filter((character) => character.faculty === CharacterFaculty.ADULT),
    };
  }

  public static async students(discordId: string) {
    const { students, adults } = await this.studentCharacters(discordId);

    if (!students.length) {
      throw new ScheduleError(
        adults.length
          ? `${adults.map((character) => `**${character.rpName}**`).join(", ")} — взрослый волшебник: не ученик и не преподаватель, поэтому расписания и записи на занятия у него нет.`
          : "У вас нет живых персонажей-учеников.",
      );
    }

    return students;
  }

  public static allCharacters(discordId: string) {
    return prisma.character.findMany({
      where: { user: { discordId } },
      orderBy: { createdAt: "asc" },
      take: 25,
      include: { user: { select: { discordId: true } } },
    });
  }

  public static character(id: string) {
    return prisma.character.findUnique({
      where: { id },
      include: { user: { select: { discordId: true } } },
    });
  }
}
