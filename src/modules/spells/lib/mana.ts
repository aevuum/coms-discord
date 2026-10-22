import type { Spell } from "../../../database/generated/prisma/client.js";

import type { ManaState } from "../types/spells.js";
import {
  BASE_SPELL_COST,
  DIFFICULTY_COEFFICIENTS,
  MANA_REGEN_PER_HOUR,
} from "./spellConfig.js";

const MS_PER_MANA = (60 * 60 * 1000) / MANA_REGEN_PER_HOUR;

const CRITICAL_LIFE_RATIO = 0.5;

const WHITE_DIGITS = [
  "<:white_0:1562494276900880485>",
  "<:white_1:1562494278708633651>",
  "<:white_2:1562494280906317854>",
  "<:white_3:1562494282798211093>",
  "<:white_4:1562494284693901473>",
  "<:white_5:1562494286438596768>",
  "<:white_6:1562494288191955015>",
  "<:white_7:1562494290171666452>",
  "<:white_8:1562494292096716812>",
  "<:white_9:1562494294865223700>",
];

const GRAY_DIGITS = [
  "<:gray_0:1562494164761841765>",
  "<:gray_1:1562494170008920145>",
  "<:gray_2:1562494172269776906>",
  "<:gray_3:1562494174220263514>",
  "<:gray_4:1562494176149639198>",
  "<:gray_5:1562494178259239043>",
  "<:gray_6:1562494180566110218>",
  "<:gray_7:1562494182277259285>",
  "<:gray_8:1562494184139661483>",
  "<:gray_9:1562494186295529654>",
];

const RED_DIGITS = [
  "<:red_0:1562494222454620161>",
  "<:red_1:1562494224824279161>",
  "<:red_2:1562494227022352456>",
  "<:red_3:1562494229131829329>",
  "<:red_4:1562494230927253705>",
  "<:red_5:1562494232969875606>",
  "<:red_6:1562494234907508776>",
  "<:red_7:1562494237340344320>",
  "<:red_8:1562494239278108813>",
  "<:red_9:1562494241383653426>",
];

const RED_MINUS = "<:red_minus:1562494243682123806>";
const GRAY_SLASH = "<:gray_slash:1562494188690477178>";

const ZHIZNENNYE = "<:txt_zhiznennye_1:1562494351169425579><:txt_zhiznennye_2:1562494353056866324><:txt_zhiznennye_3:1562494355460329562>";
const SILY = "<:txt_sily_1:1562494342931681401>";

const DANGER_CAPTION = [
  "<:txt_opasno_1:1562494339030974535><:txt_opasno_2:1562494340712890468>",
  "<:txt_tratyatsya_1:1562494345926418472><:txt_tratyatsya_2:1562494347910451240><:txt_tratyatsya_3:1562494349470732378>",
  ZHIZNENNYE,
  SILY,
].join(" ");

const CRITICAL_CAPTION = [
  "<:txt_kritichno_1:1562494331527634975><:txt_kritichno_2:1562494333775519825><:txt_kritichno_3:1562494335533060136>",
  ZHIZNENNYE,
  SILY,
  "<:txt_na_1:1562494337143672882>",
  "<:txt_iskhode_1:1562494327840706706><:txt_iskhode_2:1562494329807835247>",
].join(" ");

type BarSegments = Record<"left" | "middle" | "right", [string, string, string]>;

const MANA_BAR: BarSegments = {
  left: [
    "<:mana_l_empty:1562485510054617108>",
    "<:mana_l_half:1562485514114965504>",
    "<:mana_l_full:1562485511942180925>",
  ],
  middle: [
    "<:mana_m_empty:1562485516622897252>",
    "<:mana_m_half:1562485521068851210>",
    "<:mana_m_full:1562485518976028734>",
  ],
  right: [
    "<:mana_r_empty:1562485522956288160>",
    "<:mana_r_half:1562485527167373354>",
    "<:mana_r_full:1562485524873085098>",
  ],
};

const LIFE_BAR: BarSegments = {
  left: [
    "<:life_l_empty:1562485488416325692>",
    "<:life_l_half:1562485492933599313>",
    "<:life_l_full:1562485490832375858>",
  ],
  middle: [
    "<:life_m_empty:1562485495299047444>",
    "<:life_m_half:1562485500147933294>",
    "<:life_m_full:1562485497526358176>",
  ],
  right: [
    "<:life_r_empty:1562485502052143154>",
    "<:life_r_half:1562485507504603228>",
    "<:life_r_full:1562485505038221312>",
  ],
};

export class Mana {
  public static spellCost(spell: Pick<Spell, "difficulty" | "manaCost">) {
    if (spell.manaCost !== null && spell.manaCost !== undefined) {
      return spell.manaCost;
    }

    return Math.round(BASE_SPELL_COST * DIFFICULTY_COEFFICIENTS[spell.difficulty]);
  }

  public static regenerate(state: ManaState, now = new Date()): ManaState {
    if (state.mana >= state.maxMana) {
      return {
        mana: state.mana,
        maxMana: state.maxMana,
        manaUpdatedAt: now,
      };
    }

    const elapsed = Math.max(0, now.getTime() - state.manaUpdatedAt.getTime());

    const gained = Math.floor(elapsed / MS_PER_MANA);

    if (state.mana + gained >= state.maxMana) {
      return {
        mana: state.maxMana,
        maxMana: state.maxMana,
        manaUpdatedAt: now,
      };
    }

    return {
      mana: state.mana + gained,
      maxMana: state.maxMana,
      manaUpdatedAt: new Date(state.manaUpdatedAt.getTime() + gained * MS_PER_MANA),
    };
  }

  public static current(state: ManaState, now = new Date()) {
    return this.regenerate(state, now).mana;
  }

  public static bar(mana: number, maxMana: number, size = 10) {
    const segments = mana < 0 ? LIFE_BAR : MANA_BAR;

    const ratio = maxMana > 0 ? Math.min(Math.abs(mana) / maxMana, 1) : 0;

    const halves = mana === 0 ? 0 : Math.max(Math.round(ratio * size * 2), 1);

    return Array.from({ length: size }, (_, index) => {
      const part = index === 0 ? "left" : index === size - 1 ? "right" : "middle";
      const fill = Math.min(Math.max(halves - index * 2, 0), 2);

      return segments[part][fill];
    }).join("");
  }

  public static hasMagic(maxMana: number) {
    return maxMana > 0;
  }

  public static format(mana: number, maxMana: number) {
    if (!this.hasMagic(maxMana)) {
      return "нет";
    }

    return`${this.bar(mana, maxMana)} ${this.digits(mana, mana < 0 ? RED_DIGITS : WHITE_DIGITS)}${GRAY_SLASH}${this.digits(maxMana, GRAY_DIGITS)}`;
  }

  public static caption(mana: number, maxMana: number, timeToFull: string | null = null) {
    if (!this.hasMagic(maxMana)) {
      return "-# Персонаж не владеет магией: сквиб или маггл";
    }

    if (mana < 0) {
      return Math.abs(mana) / Math.max(maxMana, 1) < CRITICAL_LIFE_RATIO
        ? DANGER_CAPTION
        : CRITICAL_CAPTION;
    }

    const status =
      mana >= maxMana
        ? "Мана полностью восстановлена"
        : mana > 0
          ? "Мана восстанавливается"
          : "Мана иссякла";

    return `-# ${status}${timeToFull ? ` · полное восстановление через ${timeToFull}` : ""}`;
  }

  private static digits(value: number, set: string[]) {
    return `${value < 0 ? RED_MINUS : ""}${String(Math.abs(value))
      .split("")
      .map((digit) => set[Number(digit)])
      .join("")}`;
  }

  public static timeToFull(mana: number, maxMana: number) {
    if (mana >= maxMana) {
      return null;
    }

    const totalMinutes = Math.ceil(((maxMana - mana) * MS_PER_MANA) / 60000);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (!hours) {
      return `${minutes} мин`;
    }

    return minutes ? `${hours} ч ${minutes} мин` : `${hours} ч`;
  }
}
