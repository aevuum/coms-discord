import {
  ArtifactStatus,
  RuneDesignStatus,
  RuneRequestStatus,
  type Rune,
  type RuneSettings,
} from "../../../database/generated/prisma/client.js";

import { Mana } from "../../spells/lib/mana.js";
import { FUTHARK_LABELS, RUNE_MAX_MASTERY } from "./runeCatalog.js";
import { RuneRules } from "./runeRules.js";

export const RUNE_ARROW = "<:48765whitearrow:1518587298281685173>";
export const RUNE_HEADER = "<:elder_ansuz:1562468430295334952>";
export const RUNE_SUCCESS = "<:312537mark:1518581040548024430>";
export const RUNE_ERROR = "<:240191mark:1518581039172292688>";
export const RUNE_BACK = "<:26204blackarrow:1518587278467792997>";
export const RUNE_PAD = "⠀".repeat(60);

const STAGES: [number, string][] = [
  [100, "Мастерство"],
  [75, "Владение"],
  [50, "Практика"],
  [25, "Осмысление"],
  [0, "Знакомство"],
];

export const DESIGN_STATUS_LABELS: Record<RuneDesignStatus, string> = {
  [RuneDesignStatus.DRAFT]: "черновик",
  [RuneDesignStatus.PENDING]: "на проверке",
  [RuneDesignStatus.APPROVED]: "утверждена",
  [RuneDesignStatus.REJECTED]: "отклонена",
  [RuneDesignStatus.DISABLED]: "отключена",
};

export const DESIGN_STATUS_DOTS: Record<RuneDesignStatus, string> = {
  [RuneDesignStatus.DRAFT]: "<:dot_white:1562262867846373436>",
  [RuneDesignStatus.PENDING]: "<:dot_yellow:1562262864939589673>",
  [RuneDesignStatus.APPROVED]: "<:dot_green:1562262861374423044>",
  [RuneDesignStatus.REJECTED]: RUNE_ERROR,
  [RuneDesignStatus.DISABLED]: "<:dot_white:1562262867846373436>",
};

export const REQUEST_STATUS_LABELS: Record<RuneRequestStatus, string> = {
  [RuneRequestStatus.PENDING]: "<:dot_yellow:1562262864939589673> ждёт куратора",
  [RuneRequestStatus.APPROVED]: "<:dot_green:1562262861374423044> подтверждена",
  [RuneRequestStatus.REJECTED]: `${RUNE_ERROR} отклонена`,
};

export const ARTIFACT_STATUS_LABELS: Record<ArtifactStatus, string> = {
  [ArtifactStatus.ACTIVE]: "<:dot_green:1562262861374423044> исправен",
  [ArtifactStatus.UNSTABLE]: "<:dot_yellow:1562262864939589673> нестабилен",
  [ArtifactStatus.DAMAGED]: "<:warning_yellow:1562262858660708414> повреждён",
  [ArtifactStatus.DESTROYED]: `${RUNE_ERROR} разрушен`,
};

export class RuneFormat {
  public static stage(mastery: number) {
    return STAGES.find(([threshold]) => mastery >= threshold)?.[1] ?? "Знакомство";
  }

  public static masteryBar(mastery: number) {
    return Mana.format(mastery, RUNE_MAX_MASTERY);
  }

  public static runeTitle(rune: Rune) {
    return `${rune.emoji} **${rune.name}** — ${rune.meaning}`;
  }

  public static runeCard(rune: Rune, settings: RuneSettings) {
    const field = (label: string, value: string | null) => (value ? `> **${label}:** ${value}` : null);

    return [
      `-# ${FUTHARK_LABELS[rune.futhark]} · нагрузка в артефакте: ${RuneRules.runeLoad(rune, settings)}${rune.load === null ? " (по футарку)" : ""}`,
      field("Значение", rune.meaning),
      field("Область", rune.domain),
      field("Магический принцип", rune.principle),
      field("Что меняет", rune.modifies),
      field("В заклинаниях", rune.spellUse),
      field("В артефактах", rune.artifactUse),
      field("Ограничения", rune.restrictions),
      rune.principle ? null : "-# Подробное описание этой руны ещё не утверждено кураторами.",
    ].filter((line): line is string => line !== null);
  }

  public static risk(risk: number) {
    return `**${risk}%**`;
  }
}
