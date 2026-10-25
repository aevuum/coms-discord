import { Prisma } from "../../../database/generated/prisma/client.js";

import { LessonRules } from "../lib/lessonRules.js";
import { ScheduleRepository } from "../repositories/scheduleRepository.js";
import { ScheduleError } from "../types/schedule.js";

const EMOJI = /^(<a?:\w{2,32}:\d{17,20}>|\p{Extended_Pictographic}(️|‍\p{Extended_Pictographic})*)$/u;

export class SubjectService {
  public static async get(id: string) {
    const subject = await ScheduleRepository.subject(id);

    if (!subject) {
      throw new ScheduleError("Предмет не найден.");
    }

    return subject;
  }

  public static async save(id: string | null, input: { name: string; emoji: string; order: string }) {
    const name = input.name.replace(/\s+/g, " ").trim().slice(0, 60);
    const emoji = input.emoji.trim() || null;
    const sortOrder = input.order.trim() ? Number(input.order.trim()) : 0;

    if (!name) {
      throw new ScheduleError("Укажите название предмета.");
    }

    if (emoji && !EMOJI.test(emoji)) {
      throw new ScheduleError("Эмодзи — один символ или кастомный эмодзи вида `<:name:id>`.");
    }

    if (!Number.isInteger(sortOrder) || Math.abs(sortOrder) > 1000) {
      throw new ScheduleError("Порядок — целое число от -1000 до 1000.");
    }

    try {
      return id
        ? await ScheduleRepository.updateSubject(id, { name, emoji, sortOrder })
        : await ScheduleRepository.createSubject({ name, emoji, sortOrder });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ScheduleError("Предмет с таким названием уже есть.");
      }

      throw error;
    }
  }

  public static async toggle(id: string) {
    const subject = await this.get(id);

    return ScheduleRepository.updateSubject(subject.id, { active: !subject.active });
  }

  public static async saveSettings(guildId: string, reviewChannelId: string | null, reminder: string) {
    return ScheduleRepository.saveSettings(guildId, {
      reviewChannelId,
      reminderMinutes: LessonRules.reminderMinutes(reminder),
    });
  }
}
