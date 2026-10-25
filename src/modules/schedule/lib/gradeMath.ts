import { GradeWorkType } from "../../../database/generated/prisma/client.js";

export const MIN_GRADE = 1;
export const MAX_GRADE = 5;

export const WORK_TYPE_LABELS: Record<GradeWorkType, string> = {
  [GradeWorkType.THEORY]: "Теория",
  [GradeWorkType.PRACTICE]: "Практика",
  [GradeWorkType.WORK]: "Работа",
  [GradeWorkType.EXAM]: "Экзамен",
};

export type AttendanceEntry = {
  absent: boolean;
  startsAt: Date;
};

export class GradeMath {
  public static parseValue(input: string) {
    const value = Number(input.trim());

    return Number.isInteger(value) && value >= MIN_GRADE && value <= MAX_GRADE ? value : null;
  }

  public static parseWorkType(input: string) {
    return Object.values(GradeWorkType).includes(input as GradeWorkType) ? (input as GradeWorkType) : null;
  }

  public static average(values: number[]) {
    if (!values.length) {
      return null;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  public static formatAverage(average: number | null) {
    if (average === null) {
      return "—";
    }

    return (Math.round(average * 100) / 100).toFixed(2).replace(/0$/, "").replace(/\.0?$/, "").replace(".", ",");
  }

  public static attendance(entries: AttendanceEntry[], now = new Date()) {
    const held = entries.filter((entry) => entry.startsAt.getTime() <= now.getTime());

    return {
      present: held.filter((entry) => !entry.absent).length,
      total: held.length,
    };
  }
}
