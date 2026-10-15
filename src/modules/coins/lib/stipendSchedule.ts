const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const PAYOUT_WEEKDAY = 1;
const PAYOUT_HOUR_UTC = 9;

export class StipendSchedule {
  public static readonly LABEL = "каждый понедельник в 12:00 МСК";

  public static periodStart(now = new Date()) {
    const start = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        PAYOUT_HOUR_UTC,
      ),
    );

    const daysSince = (start.getUTCDay() - PAYOUT_WEEKDAY + 7) % 7;

    start.setUTCDate(start.getUTCDate() - daysSince);

    if (start.getTime() > now.getTime()) {
      start.setTime(start.getTime() - WEEK_MS);
    }

    return start;
  }

  public static nextPayout(now = new Date()) {
    return new Date(this.periodStart(now).getTime() + WEEK_MS);
  }

  public static isDue(lastPaidAt: Date | null, now = new Date()) {
    return !lastPaidAt || lastPaidAt.getTime() < this.periodStart(now).getTime();
  }
}
