import { RuneAuditAction } from "../../../database/generated/prisma/client.js";

import prisma from "../../../database/prisma.js";
import { RuneAudit } from "./runeAudit.js";
import { RuneError, RuneRegistry } from "./runeRegistry.js";

export type RuneTextInput = {
  domain: string;
  principle: string;
  modifies: string;
  spellUse: string;
  artifactUse: string;
};

export type RuneMetaInput = {
  meaning: string;
  load: string;
  restrictions: string;
};

export type SettingsInput = {
  elderLoad: string;
  youngerLoad: string;
  masteryReductionPct: string;
  riskBounds: string;
  defaults: string;
};

const text = (value: string, max = 600) => value.trim().slice(0, max) || null;

export class RuneDefinitionService {
  public static async updateText(key: string, input: RuneTextInput, actorId: string) {
    await RuneRegistry.get(key);

    const rune = await prisma.rune.update({
      where: { key },
      data: {
        domain: text(input.domain),
        principle: text(input.principle),
        modifies: text(input.modifies),
        spellUse: text(input.spellUse),
        artifactUse: text(input.artifactUse),
      },
    });

    RuneRegistry.replace(rune);

    await RuneAudit.write({ action: RuneAuditAction.RUNE_UPDATED, actorId, runeKey: key, note: "описание" });

    return rune;
  }

  public static async updateMeta(key: string, input: RuneMetaInput, actorId: string) {
    const current = await RuneRegistry.get(key);
    const meaning = input.meaning.trim();

    if (meaning.length < 2) {
      throw new RuneError("Укажите основное значение руны.");
    }

    const loadText = input.load.trim();

    if (loadText && (!/^\d+$/.test(loadText) || Number(loadText) > 50)) {
      throw new RuneError("Нагрузка руны: целое число от 0 до 50 или пусто — по футарку.");
    }

    const rune = await prisma.rune.update({
      where: { key },
      data: {
        meaning: meaning.slice(0, 120),
        load: loadText ? Number(loadText) : null,
        restrictions: text(input.restrictions),
      },
    });

    RuneRegistry.replace(rune);

    await RuneAudit.write({
      action: RuneAuditAction.RUNE_UPDATED,
      actorId,
      runeKey: key,
      fromValue: current.load,
      toValue: rune.load,
      note: "значение, нагрузка, ограничения",
    });

    return rune;
  }

  public static async updateSettings(input: SettingsInput, actorId: string) {
    const number = (value: string, min: number, max: number, label: string) => {
      const trimmed = value.trim();

      if (!/^\d+$/.test(trimmed) || Number(trimmed) < min || Number(trimmed) > max) {
        throw new RuneError(`${label}: целое число от ${min} до ${max}.`);
      }

      return Number(trimmed);
    };

    const pair = (value: string, label: string) => {
      const match = value.trim().match(/^(\d+)\s*[-–—/ ]\s*(\d+)$/);

      if (!match) {
        throw new RuneError(`${label}: два числа через дефис, например 1-95.`);
      }

      return [Number(match[1]), Number(match[2])] as const;
    };

    const [minRisk, maxRisk] = pair(input.riskBounds, "Границы риска");
    const [defaultInitialMastery, defaultBaseRisk] = pair(input.defaults, "Значения по умолчанию");

    if (minRisk < 0 || maxRisk > 100 || minRisk >= maxRisk) {
      throw new RuneError("Границы риска: от 0 до 100, нижняя меньше верхней.");
    }

    if (defaultInitialMastery > 100 || defaultBaseRisk > 100) {
      throw new RuneError("Начальное владение и базовый риск — от 0 до 100.");
    }

    const settings = await prisma.runeSettings.update({
      where: { id: "global" },
      data: {
        elderLoad: number(input.elderLoad, 0, 50, "Нагрузка старшего футарка"),
        youngerLoad: number(input.youngerLoad, 0, 50, "Нагрузка младшего футарка"),
        masteryReductionPct: number(input.masteryReductionPct, 0, 100, "Снижение риска от владения"),
        minRisk,
        maxRisk,
        defaultInitialMastery,
        defaultBaseRisk,
      },
    });

    RuneRegistry.replaceSettings(settings);

    await RuneAudit.write({ action: RuneAuditAction.SETTINGS_UPDATED, actorId });

    return settings;
  }
}
