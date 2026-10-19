import prisma from "../../../database/prisma.js";

export class TermsRepository {
  public static find(discordId: string) {
    return prisma.termsAcceptance.findUnique({ where: { discordId } });
  }

  public static accept(discordId: string, version: string) {
    return prisma.termsAcceptance.upsert({
      where: { discordId },
      create: { discordId, version },
      update: { version, acceptedAt: new Date() },
    });
  }

  public static withdraw(discordId: string) {
    return prisma.termsAcceptance.deleteMany({ where: { discordId } });
  }
}
