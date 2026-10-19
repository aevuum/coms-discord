import prisma from "../../../database/prisma.js";

export type ActivityRow = {
  discordId: string;
  messages: number;
  voiceSeconds: number;
  score: number;
};

type RawRow = {
  discordId: string;
  messages: number | bigint;
  voiceSeconds: number | bigint;
  score: number | bigint;
};

const toRow = (row: RawRow): ActivityRow => ({
  discordId: row.discordId,
  messages: Number(row.messages),
  voiceSeconds: Number(row.voiceSeconds),
  score: Number(row.score),
});

export class ActivityRepository {
  public static async page(offset: number, limit: number) {
    const rows = await prisma.$queryRaw<RawRow[]>`
      SELECT "discordId",
             "weeklyMessages" AS messages,
             "weeklyVoiceSeconds" AS "voiceSeconds",
             "weeklyMessages" + "weeklyVoiceSeconds" / 60 AS score
      FROM "User"
      WHERE "weeklyMessages" + "weeklyVoiceSeconds" / 60 > 0
      ORDER BY score DESC, "weeklyMessages" DESC, "discordId" ASC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return rows.map(toRow);
  }

  public static async count() {
    const [row] = await prisma.$queryRaw<{ total: number | bigint }[]>`
      SELECT COUNT(*) AS total
      FROM "User"
      WHERE "weeklyMessages" + "weeklyVoiceSeconds" / 60 > 0
    `;

    return Number(row?.total ?? 0);
  }

  public static async position(discordId: string) {
    const [row] = await prisma.$queryRaw<(RawRow & { rank: number | bigint })[]>`
      SELECT * FROM (
        SELECT "discordId",
               "weeklyMessages" AS messages,
               "weeklyVoiceSeconds" AS "voiceSeconds",
               "weeklyMessages" + "weeklyVoiceSeconds" / 60 AS score,
               ROW_NUMBER() OVER (
                 ORDER BY "weeklyMessages" + "weeklyVoiceSeconds" / 60 DESC,
                          "weeklyMessages" DESC,
                          "discordId" ASC
               ) AS rank
        FROM "User"
        WHERE "weeklyMessages" + "weeklyVoiceSeconds" / 60 > 0
      ) ranked
      WHERE "discordId" = ${discordId}
    `;

    return row ? { ...toRow(row), rank: Number(row.rank) } : null;
  }

  public static getSettings(guildId: string) {
    return prisma.activitySettings.upsert({
      where: { guildId },
      update: {},
      create: { guildId },
    });
  }

  public static updateRewards(
    guildId: string,
    rewards: { rewardFirst: number; rewardSecond: number; rewardThird: number },
  ) {
    return prisma.activitySettings.upsert({
      where: { guildId },
      update: rewards,
      create: { guildId, ...rewards },
    });
  }

  public static async claimReset(guildId: string, previous: Date | null, now: Date) {
    const result = await prisma.activitySettings.updateMany({
      where: { guildId, lastResetAt: previous },
      data: { lastResetAt: now },
    });

    return result.count > 0;
  }

  public static resetWeek() {
    return prisma.user.updateMany({
      where: { OR: [{ weeklyMessages: { gt: 0 } }, { weeklyVoiceSeconds: { gt: 0 } }] },
      data: { weeklyMessages: 0, weeklyVoiceSeconds: 0 },
    });
  }
}
