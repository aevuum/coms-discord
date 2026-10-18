import { RollKind, type RollKindMeta } from "../types/rolls.js";

export const ROLL_KINDS: Record<RollKind, RollKindMeta> = {
  [RollKind.RACE]: {
    kind: RollKind.RACE,
    slug: "race",
    command: "race",
    plural: "Расы",
    single: "Раса",
    accusative: "расу",
    emoji: "<:67793memberhexagon:1518587303218511892>",
    defaultHint: "Выпадает, если не выпала ни одна редкая раса.",
  },
  [RollKind.TRAIT]: {
    kind: RollKind.TRAIT,
    slug: "trait",
    command: "trait",
    plural: "Трейты",
    single: "Трейт",
    accusative: "трейт",
    emoji: "<a:20409magicbook:1519585001359020094>",
    defaultHint: "Выпадает, если не выпала ни одна магическая особенность.",
  },
};

export function kindBySlug(slug: string) {
  return Object.values(ROLL_KINDS).find((meta) => meta.slug === slug) ?? null;
}
