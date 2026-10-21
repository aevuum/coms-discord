import {
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
} from "discord.js";

import type {
  Spell,
  SpellDifficulty,
} from "../../../database/generated/prisma/client.js";

import {
  SpellMode,
  type CastResult,
  type SpellPage,
} from "../types/spells.js";
import { Mana } from "./mana.js";
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_STARS,
} from "./spellConfig.js";
import { SpellComponents } from "./spellComponents.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const WAND = "<:515636magicwandids:1519585028596563968>";
const POTION = "<:29865potionwhite:1518587289989550100>";
const BOOK = "<:6849serverguide:1518587250802426078>";
const LOW_MANA_RATIO = 0.2;
const CRITICAL_MANA_RATIO = 0.5;

export class SpellContainer {
  public static page(page: SpellPage, mode: SpellMode) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${BOOK} ${mode === SpellMode.Manage ? "Управление заклинаниями" : "Книга заклинаний"}`,
          "",
          `${ARROW} Чтобы применить заклинание, выделите формулу жирным в посте таппера:`,
          "> \\*\\*Экспекто Патронум\\*\\* → **Экспекто Патронум**",
          `-# Всего заклинаний: ${page.total} · Страница ${page.page + 1} из ${page.totalPages}`,
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        page.spells.length
          ? page.spells.map((spell) => this.listEntry(spell)).join("\n")
          : `${ARROW} Заклинаний пока нет.`,
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    if (page.spells.length) {
      container.addActionRowComponents(
        SpellComponents.spellSelect(page, mode),
      );
    }

    container.addActionRowComponents(SpellComponents.navigation(page, mode));

    return container;
  }

  public static detail(spell: Spell, mode: SpellMode, page: number) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${WAND} ${spell.name}`,
          `-# ${this.difficulty(spell.difficulty)} · ${
            spell.isCustom ? "пользовательское" : "каноническое"
          }`,
          spell.description ? `> ${spell.description}` : null,
        ]
          .filter((line) => line !== null)
          .join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
    );

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `### ${ARROW} Формулы`,
          spell.incantations.map((item) => `\`${item}\``).join(" · "),
          `### ${POTION} Стоимость`,
          `**${Mana.spellCost(spell)}** маны${
            spell.manaCost !== null ? " · задана вручную" : ""
          }`,
        ].join("\n"),
      ),
    );

    const preview = spell.imageUrl ?? spell.gifUrls[0] ?? null;

    if (preview) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(
          new MediaGalleryItemBuilder().setURL(preview),
        ),
      );
    } else {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "-# Картинка не задана — гифка подберётся автоматически при первом применении.",
        ),
      );
    }

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      SpellComponents.detailActions(spell, mode, page),
    );

    return container;
  }

  public static deleteConfirm(spell: Spell, page: number) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:14605delete:1518587266505642074> Удаление заклинания",
          "",
          `${ARROW} Удалить заклинание **${spell.name}**?`,
          "-# История применений сохранится, но бот перестанет распознавать его формулы.",
        ].join("\n"),
      ),
    );

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    container.addActionRowComponents(
      SpellComponents.deleteActions(spell, page),
    );

    return container;
  }

  public static deleted(spell: Spell, page: number) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:312537mark:1518581040548024430> Заклинание удалено",
          "",
          `${ARROW} **${spell.name}** больше не распознаётся ботом.`,
        ].join("\n"),
      ),
    );

    container.addActionRowComponents(
      SpellComponents.backRow(SpellMode.Manage, page),
    );

    return container;
  }

  public static cast(result: CastResult) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    result.spells.forEach((cast, index) => {
      if (index > 0) {
        container.addSeparatorComponents(
          new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
        );
      }

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            `## ${WAND} ${cast.spell.incantations[0] ?? cast.spell.name}`,
            `-# ${cast.spell.name} · ${this.difficulty(cast.spell.difficulty)} · −${cast.manaCost} маны`,
            cast.spell.description ? `> *${cast.spell.description}*` : null,
          ]
            .filter((line) => line !== null)
            .join("\n"),
        ),
      );

      if (cast.imageUrl) {
        container.addMediaGalleryComponents(
          new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(cast.imageUrl),
          ),
        );
      }
    });

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    const timeToFull = Mana.timeToFull(result.manaAfter, result.maxMana);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `### ${POTION} Мана · ${result.characterName}`,
          `${Mana.format(result.manaAfter, result.maxMana)}  \`−${result.totalCost}\``,
          this.isLowMana(result)
            ? "-# <:warning_yellow:1562262858660708414> Силы на исходе — ещё пара заклинаний, и персонаж начнёт истощаться."
            : null,
          `-# ${Mana.status(result.manaAfter, result.maxMana)}${timeToFull ? ` · полное восстановление через ${timeToFull}` : ""}`,
        ]
          .filter((line) => line !== null)
          .join("\n"),
      ),
    );

    if (result.manaAfter < 0) {
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small),
      );

      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(this.exhaustionWarning(result)),
      );
    }

    return container;
  }

  private static isLowMana(result: CastResult) {
    return (
      result.manaAfter >= 0 &&
      result.manaAfter <= result.maxMana * LOW_MANA_RATIO
    );
  }

  private static exhaustionWarning(result: CastResult) {
    const critical = result.manaAfter <= -result.maxMana * CRITICAL_MANA_RATIO;

    return [
      "### <:warning_yellow:1562262858660708414> Магическое истощение",
      critical
        ? `> **${result.characterName}** на грани обморока — ещё одно заклинание, и персонаж рухнет без сознания от нехватки сил.`
        : `> Мана ушла в минус. **${result.characterName}** едва держится на ногах — если продолжить колдовать, персонаж скоро потеряет сознание от нехватки сил.`,
      "-# Персонажу нужен отдых, пока мана не восстановится.",
    ].join("\n");
  }

  public static error(message: string) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "# <:240191mark:1518581039172292688> Ошибка",
          "",
          `${ARROW} ${message}`,
        ].join("\n"),
      ),
    );

    return container;
  }

  private static listEntry(spell: Spell) {
    return [
      `${this.stars(spell.difficulty)} **${spell.name}** · ${Mana.spellCost(spell)} маны`,
      `-# ${spell.incantations[0] ?? "—"}`,
    ].join("\n");
  }

  private static difficulty(difficulty: SpellDifficulty) {
    return `${this.stars(difficulty)} ${DIFFICULTY_LABELS[difficulty]}`;
  }

  private static stars(difficulty: SpellDifficulty) {
    const count = DIFFICULTY_STARS[difficulty];

    return "★".repeat(count) + "☆".repeat(5 - count);
  }
}
