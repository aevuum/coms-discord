import type {
  Prisma,
  StaffApplicationStatus,
} from "../../../database/generated/prisma/client.js";
import prisma from "../../../database/prisma.js";

import type { ApplicationAnswer } from "../types/application.js";

export class ApplicationRepository {
  public static findById(id: string) {
    return prisma.staffApplication.findUnique({ where: { id } });
  }

  public static findActive(userId: string, tagId: string) {
    return prisma.staffApplication.findFirst({
      where: { userId, tagId, status: { in: ["AWAITING_POST", "PENDING"] } },
    });
  }

  public static findAwaitingPost(userId: string) {
    return prisma.staffApplication.findFirst({
      where: { userId, status: "AWAITING_POST" },
      orderBy: { updatedAt: "desc" },
    });
  }

  public static async createDraft(data: {
    guildId: string;
    userId: string;
    tagId: string;
    roleName: string;
    roleId: string | null;
    answers: ApplicationAnswer[];
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.staffApplication.deleteMany({
        where: { userId: data.userId, tagId: data.tagId, status: "DRAFT" },
      });

      return tx.staffApplication.create({
        data: { ...data, answers: data.answers as Prisma.InputJsonValue },
      });
    });
  }

  public static updateAnswers(id: string, answers: ApplicationAnswer[]) {
    return prisma.staffApplication.update({
      where: { id },
      data: { answers: answers as Prisma.InputJsonValue },
    });
  }

  public static async awaitPost(id: string, trialPrompt: string) {
    const result = await prisma.staffApplication.updateMany({
      where: { id, status: "DRAFT" },
      data: { status: "AWAITING_POST", trialPrompt },
    });

    return result.count > 0;
  }

  public static async claimPending(
    id: string,
    from: StaffApplicationStatus,
    trialPost: string | null,
  ) {
    const result = await prisma.staffApplication.updateMany({
      where: { id, status: from },
      data: { status: "PENDING", ...(trialPost ? { trialPost } : {}) },
    });

    return result.count > 0;
  }

  public static revert(id: string, status: StaffApplicationStatus) {
    return prisma.staffApplication.update({ where: { id }, data: { status } });
  }

  public static setReviewMessage(id: string, staffMessageId: string, threadId: string | null) {
    return prisma.staffApplication.update({
      where: { id },
      data: { staffMessageId, threadId },
    });
  }

  public static vote(applicationId: string, userId: string, stars: number) {
    return prisma.staffApplicationVote.upsert({
      where: { applicationId_userId: { applicationId, userId } },
      create: { applicationId, userId, stars },
      update: { stars },
    });
  }

  public static votes(applicationId: string) {
    return prisma.staffApplicationVote.findMany({
      where: { applicationId },
      orderBy: { createdAt: "asc" },
    });
  }

  public static async decide(
    id: string,
    status: "ACCEPTED" | "REJECTED",
    decidedById: string,
    rejectReason: string | null,
  ) {
    const result = await prisma.staffApplication.updateMany({
      where: { id, status: "PENDING" },
      data: { status, decidedById, decidedAt: new Date(), rejectReason },
    });

    return result.count > 0;
  }
}
