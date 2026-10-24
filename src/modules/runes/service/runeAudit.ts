import type { BaseInteraction } from "discord.js";

import {
  RuneAuditAction,
  type Prisma,
} from "../../../database/generated/prisma/client.js";

import prisma from "../../../database/prisma.js";
import { PermissionService } from "../../permissions/service/permissionService.js";
import { RuneError } from "./runeRegistry.js";

export const RUNES_MANAGE_KEY = "manage.runes";

export type AuditEntry = {
  action: RuneAuditAction;
  actorId: string;
  characterId?: string | null;
  runeKey?: string | null;
  formulaId?: string | null;
  recipeId?: string | null;
  fromValue?: number | null;
  toValue?: number | null;
  note?: string | null;
};

type Client = Prisma.TransactionClient | typeof prisma;

export class RuneAudit {
  public static write(entry: AuditEntry, client: Client = prisma) {
    return client.runeAuditLog.create({
      data: { ...entry, note: entry.note?.slice(0, 500) ?? null },
    });
  }

  public static recent(limit = 15, characterId?: string) {
    return prisma.runeAuditLog.findMany({
      where: characterId ? { characterId } : {},
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { character: { select: { rpName: true } } },
    });
  }

  public static async assertCurator(interaction: BaseInteraction) {
    const subject = await PermissionService.resolveSubject(interaction);

    if (!(await PermissionService.canUse(subject, RUNES_MANAGE_KEY))) {
      throw new RuneError("У вас нет доступа к управлению рунами и артефактами.");
    }
  }

  public static async isCurator(interaction: BaseInteraction) {
    return this.assertCurator(interaction).then(
      () => true,
      () => false,
    );
  }
}

export const AUDIT_LABELS: Record<RuneAuditAction, string> = {
  [RuneAuditAction.RUNE_UPDATED]: "изменена руна",
  [RuneAuditAction.RUNE_LEARNED]: "руна изучена",
  [RuneAuditAction.RUNE_FORGOTTEN]: "руна убрана",
  [RuneAuditAction.MASTERY_CHANGED]: "владение изменено",
  [RuneAuditAction.STUDY_REQUESTED]: "заявка на изучение",
  [RuneAuditAction.STUDY_REJECTED]: "заявка отклонена",
  [RuneAuditAction.FORMULA_PROPOSED]: "предложена формула",
  [RuneAuditAction.FORMULA_CREATED]: "создана формула",
  [RuneAuditAction.FORMULA_UPDATED]: "формула изменена",
  [RuneAuditAction.FORMULA_APPROVED]: "формула утверждена",
  [RuneAuditAction.FORMULA_REJECTED]: "формула отклонена",
  [RuneAuditAction.FORMULA_DISABLED]: "формула отключена",
  [RuneAuditAction.FORMULA_ATTEMPTED]: "попытка формулы на проверку",
  [RuneAuditAction.FORMULA_REVIEWED]: "попытка формулы рассмотрена",
  [RuneAuditAction.RECIPE_CREATED]: "создан рецепт",
  [RuneAuditAction.RECIPE_UPDATED]: "рецепт изменён",
  [RuneAuditAction.RECIPE_APPROVED]: "рецепт утверждён",
  [RuneAuditAction.RECIPE_REJECTED]: "рецепт отклонён",
  [RuneAuditAction.RECIPE_DISABLED]: "рецепт отключён",
  [RuneAuditAction.ARTIFACT_CRAFTED]: "создание артефакта",
  [RuneAuditAction.MATERIAL_CHANGED]: "материал изменён",
  [RuneAuditAction.BLANK_CHANGED]: "заготовка изменена",
  [RuneAuditAction.SETTINGS_UPDATED]: "настройки изменены",
};
