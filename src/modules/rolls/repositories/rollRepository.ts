import prisma from "../../../database/prisma.js";

import type { RollKind } from "../types/rolls.js";

export type RollEntryData = {
  name: string;
  description: string | null;
  emoji: string | null;
  imageUrl: string | null;
  chance: number;
};

export class RollRepository {
  public static list(kind: RollKind) {
    return prisma.rollEntry.findMany({
      where: { kind },
      orderBy: [{ isDefault: "desc" }, { chance: "desc" }, { name: "asc" }],
    });
  }

  public static count(kind: RollKind) {
    return prisma.rollEntry.count({ where: { kind } });
  }

  public static get(id: string) {
    return prisma.rollEntry.findUnique({ where: { id } });
  }

  public static create(kind: RollKind, data: RollEntryData & { isDefault?: boolean }) {
    return prisma.rollEntry.create({ data: { kind, ...data } });
  }

  public static update(id: string, data: RollEntryData) {
    return prisma.rollEntry.update({ where: { id }, data });
  }

  public static delete(id: string) {
    return prisma.rollEntry.delete({ where: { id } });
  }
}
