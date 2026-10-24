import {
  RuneOperationStatus,
  type Prisma,
  type RuneOperation,
  type RuneOperationKind,
} from "../../../database/generated/prisma/client.js";

import prisma from "../../../database/prisma.js";
import { RuneError } from "./runeRegistry.js";

const OPERATION_TTL_MS = 15 * 60 * 1000;

export type OperationInput = {
  kind: RuneOperationKind;
  characterId: string;
  actorId: string;
  risk: number;
  formulaId?: string;
  recipeId?: string;
  extraMaterialIds?: string[];
};

export type OperationResolution<T> = {
  status: RuneOperationStatus;
  data: Omit<Prisma.RuneOperationUpdateInput, "status" | "resolvedAt">;
  result: T;
};

export class RuneOperations {
  public static async open(input: OperationInput) {
    await prisma.runeOperation.updateMany({
      where: {
        characterId: input.characterId,
        kind: input.kind,
        status: RuneOperationStatus.PENDING,
      },
      data: { status: RuneOperationStatus.CANCELLED, resolvedAt: new Date() },
    });

    return prisma.runeOperation.create({
      data: {
        kind: input.kind,
        characterId: input.characterId,
        actorId: input.actorId,
        risk: input.risk,
        formulaId: input.formulaId,
        recipeId: input.recipeId,
        extraMaterialIds: input.extraMaterialIds ?? [],
      },
    });
  }

  public static async cancel(operationId: string, actorId: string) {
    await prisma.runeOperation.updateMany({
      where: { id: operationId, actorId, status: RuneOperationStatus.PENDING },
      data: { status: RuneOperationStatus.CANCELLED, resolvedAt: new Date() },
    });
  }

  public static resolve<T>(
    operationId: string,
    actorId: string,
    kind: RuneOperationKind,
    work: (tx: Prisma.TransactionClient, operation: RuneOperation) => Promise<OperationResolution<T>>,
  ) {
    return prisma.$transaction(
      async (tx) => {
        const claimed = await tx.runeOperation.updateMany({
          where: {
            id: operationId,
            actorId,
            kind,
            status: RuneOperationStatus.PENDING,
            createdAt: { gte: new Date(Date.now() - OPERATION_TTL_MS) },
          },
          data: { status: RuneOperationStatus.DONE, resolvedAt: new Date() },
        });

        if (!claimed.count) {
          throw new RuneError("Эта попытка уже выполнена, отменена или устарела. Начните заново.");
        }

        const operation = await tx.runeOperation.findUniqueOrThrow({ where: { id: operationId } });
        const resolution = await work(tx, operation);

        await tx.runeOperation.update({
          where: { id: operationId },
          data: { ...resolution.data, status: resolution.status },
        });

        return resolution.result;
      },
      { timeout: 20_000 },
    );
  }
}
