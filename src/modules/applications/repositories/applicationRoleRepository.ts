import { Prisma } from "../../../database/generated/prisma/client.js";
import prisma from "../../../database/prisma.js";

import type { ApplicationQuestion } from "../types/application.js";

export class ApplicationRoleRepository {
  public static find(tagId: string) {
    return prisma.staffApplicationRole.findUnique({ where: { tagId } });
  }

  public static list() {
    return prisma.staffApplicationRole.findMany();
  }

  public static setOpen(tagId: string, open: boolean) {
    return prisma.staffApplicationRole.upsert({
      where: { tagId },
      create: { tagId, open },
      update: { open },
    });
  }

  public static setRole(tagId: string, roleId: string | null) {
    return prisma.staffApplicationRole.upsert({
      where: { tagId },
      create: { tagId, roleId },
      update: { roleId },
    });
  }

  public static setQuestions(tagId: string, questions: ApplicationQuestion[] | null) {
    const value = questions ? (questions as Prisma.InputJsonValue) : Prisma.DbNull;

    return prisma.staffApplicationRole.upsert({
      where: { tagId },
      create: { tagId, questions: value },
      update: { questions: value },
    });
  }
}
