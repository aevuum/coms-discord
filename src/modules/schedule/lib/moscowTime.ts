const OFFSET_MS = 3 * 60 * 60 * 1000;

const MONTHS = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const INPUT = /^(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2}|\d{4}))?(?:\s+|\s*[,TВв]\s*)(\d{1,2})[:.](\d{2})$/;

const pad = (value: number) => String(value).padStart(2, "0");

export class MoscowTime {
  public static parse(input: string, now = new Date()) {
    const match = INPUT.exec(input.trim());

    if (!match) {
      return null;
    }

    const [, dayText, monthText, yearText, hourText, minuteText] = match;
    const day = Number(dayText);
    const month = Number(monthText);
    const hour = Number(hourText);
    const minute = Number(minuteText);

    if (hour > 23 || minute > 59) {
      return null;
    }

    const build = (year: number) => {
      const date = new Date(Date.UTC(year, month - 1, day, hour, minute) - OFFSET_MS);
      const local = this.parts(date);

      return local.year === year && local.month === month && local.day === day ? date : null;
    };

    if (yearText) {
      const year = yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText);

      return build(year);
    }

    const currentYear = this.parts(now).year;
    const date = build(currentYear);

    if (date && date.getTime() >= now.getTime()) {
      return date;
    }

    return build(currentYear + 1);
  }

  public static parts(date: Date) {
    const shifted = new Date(date.getTime() + OFFSET_MS);

    return {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
      hour: shifted.getUTCHours(),
      minute: shifted.getUTCMinutes(),
    };
  }

  public static format(date: Date) {
    const { year, month, day, hour, minute } = this.parts(date);

    return `${pad(day)}.${pad(month)}.${year} ${pad(hour)}:${pad(minute)}`;
  }

  public static discord(date: Date) {
    const unix = Math.floor(date.getTime() / 1000);

    return `<t:${unix}:F> · <t:${unix}:R>`;
  }

  public static monthKey(date: Date) {
    const { year, month } = this.parts(date);

    return `${year}-${pad(month)}`;
  }

  public static isMonthKey(key: string) {
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(key);
  }

  public static monthRange(key: string) {
    const [year, month] = key.split("-").map(Number);

    return {
      from: new Date(Date.UTC(year, month - 1, 1) - OFFSET_MS),
      to: new Date(Date.UTC(year, month, 1) - OFFSET_MS),
    };
  }

  public static monthLabel(key: string) {
    const [year, month] = key.split("-").map(Number);

    return `${MONTHS[month - 1]} ${year}`;
  }

  public static recentMonths(count: number, now = new Date()) {
    const { year, month } = this.parts(now);

    return Array.from({ length: count }, (_, index) => {
      const total = year * 12 + (month - 1) - index;

      return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
    });
  }
}
