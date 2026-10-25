import {
  MAX_AHEAD_DAYS,
  MAX_CAPACITY,
  MIN_LEAD_MINUTES,
  MAX_REMINDER_MINUTES,
  ScheduleError,
} from "../types/schedule.js";
import { MoscowTime } from "./moscowTime.js";

export class LessonRules {
  public static topic(input: string) {
    const topic = input.replace(/\s+/g, " ").trim();

    if (topic.length < 2) {
      throw new ScheduleError("Укажите тему занятия.");
    }

    return topic.slice(0, 150);
  }

  public static startsAt(input: string, now = new Date()) {
    const date = MoscowTime.parse(input, now);

    if (!date) {
      throw new ScheduleError("Не удалось разобрать дату. Пример: `25.10.2026 19:00` (время московское).");
    }

    if (date.getTime() < now.getTime() + MIN_LEAD_MINUTES * 60_000) {
      throw new ScheduleError(`Занятие должно начинаться не раньше чем через ${MIN_LEAD_MINUTES} минут.`);
    }

    if (date.getTime() > now.getTime() + MAX_AHEAD_DAYS * 24 * 60 * 60_000) {
      throw new ScheduleError(`Занятие можно назначить не дальше чем на ${MAX_AHEAD_DAYS} дней вперёд.`);
    }

    return date;
  }

  public static capacity(input: string, enrolled = 0) {
    const text = input.trim();

    if (!text) {
      return null;
    }

    const capacity = Number(text);

    if (!Number.isInteger(capacity) || capacity < 1 || capacity > MAX_CAPACITY) {
      throw new ScheduleError(`Количество мест — целое число от 1 до ${MAX_CAPACITY} или пусто, если без ограничений.`);
    }

    if (capacity < enrolled) {
      throw new ScheduleError(`На занятие уже записались ${enrolled} учеников — мест не может быть меньше.`);
    }

    return capacity;
  }

  public static reminderMinutes(input: string) {
    const minutes = Number(input.trim());

    if (!Number.isInteger(minutes) || minutes < 1 || minutes > MAX_REMINDER_MINUTES) {
      throw new ScheduleError(`Напоминание — целое число минут от 1 до ${MAX_REMINDER_MINUTES}.`);
    }

    return minutes;
  }

  public static reminderDue(startsAt: Date, reminderMinutes: number, now = new Date()) {
    const left = startsAt.getTime() - now.getTime();

    return left > 0 && left <= reminderMinutes * 60_000;
  }
}
