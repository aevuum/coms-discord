import prisma from "../../../database/prisma.js";
import { RollKind } from "../types/rolls.js";
import { RollService } from "./rollService.js";

export class PendingTraitService {
  public static async resolve(discordId: string) {
    const entries = await RollService.list(RollKind.TRAIT);
    const pending = await prisma.pendingTraitRoll.findUnique({ where: { discordId } });

    const kept = pending ? entries.find((entry) => entry.id === pending.rollEntryId) : null;

    if (pending && kept) {
      return { entry: kept, entries, rolledAt: pending.rolledAt, repeated: true };
    }

    const { entry } = await RollService.roll(RollKind.TRAIT);

    const saved = await prisma.pendingTraitRoll.upsert({
      where: { discordId },
      create: { discordId, rollEntryId: entry.id },
      update: { rollEntryId: entry.id, rolledAt: new Date() },
    });

    return { entry, entries, rolledAt: saved.rolledAt, repeated: false };
  }

  public static consume(discordId: string) {
    return prisma.pendingTraitRoll.deleteMany({ where: { discordId } });
  }
}
