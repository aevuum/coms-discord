import prisma from "../../../database/prisma.js";

export class ReportSettingsRepository {
  public static async getReviewerRoleIds(guildId: string) {
    const settings = await prisma.reportSettings.findUnique({ where: { guildId } });

    return settings?.reviewerRoleIds ?? [];
  }

  public static setReviewerRoleIds(guildId: string, reviewerRoleIds: string[]) {
    return prisma.reportSettings.upsert({
      where: { guildId },
      create: { guildId, reviewerRoleIds },
      update: { reviewerRoleIds },
    });
  }
}
