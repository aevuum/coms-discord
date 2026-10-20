import prisma from "../../../database/prisma.js";

const WITH_VOTES = {
  reactions: true,
  ratings: { orderBy: { createdAt: "asc" as const } },
};

export class SuggestionRepository {
  public static create(data: {
    guildId: string;
    authorId: string;
    title: string;
    category: string;
    description: string;
    benefit: string | null;
    pingRoleId: string | null;
  }) {
    return prisma.suggestion.create({ data, include: WITH_VOTES });
  }

  public static getSettings(guildId: string) {
    return prisma.suggestionSettings.findUnique({ where: { guildId } });
  }

  public static setPingRole(guildId: string, pingRoleId: string | null) {
    return prisma.suggestionSettings.upsert({
      where: { guildId },
      create: { guildId, pingRoleId },
      update: { pingRoleId },
    });
  }

  public static findById(id: string) {
    return prisma.suggestion.findUnique({ where: { id }, include: WITH_VOTES });
  }

  public static delete(id: string) {
    return prisma.suggestion.delete({ where: { id } }).catch(() => null);
  }

  public static lastByAuthor(authorId: string) {
    return prisma.suggestion.findFirst({ where: { authorId }, orderBy: { createdAt: "desc" } });
  }

  public static setMessage(id: string, messageId: string, threadId: string | null) {
    return prisma.suggestion.update({ where: { id }, data: { messageId, threadId }, include: WITH_VOTES });
  }

  public static async react(suggestionId: string, userId: string, value: 1 | -1) {
    const existing = await prisma.suggestionReaction.findUnique({
      where: { suggestionId_userId: { suggestionId, userId } },
    });

    if (existing?.value === value) {
      await prisma.suggestionReaction.deleteMany({ where: { suggestionId, userId } });

      return 0;
    }

    await prisma.suggestionReaction.upsert({
      where: { suggestionId_userId: { suggestionId, userId } },
      create: { suggestionId, userId, value },
      update: { value },
    });

    return value;
  }

  public static rate(suggestionId: string, userId: string, stars: number) {
    return prisma.suggestionRating.upsert({
      where: { suggestionId_userId: { suggestionId, userId } },
      create: { suggestionId, userId, stars },
      update: { stars },
    });
  }

  public static async decide(
    id: string,
    status: "ACCEPTED" | "REJECTED",
    decidedById: string,
    reason: string | null,
  ) {
    const result = await prisma.suggestion.updateMany({
      where: { id, status: "PENDING" },
      data: { status, decidedById, decidedAt: new Date(), reason },
    });

    return result.count > 0;
  }
}
