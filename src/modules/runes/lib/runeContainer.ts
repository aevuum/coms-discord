import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from "discord.js";

import type { Character } from "../../../database/generated/prisma/client.js";

import { Storage } from "../../../lib/storage.js";
import { CharacterFormatter } from "../../economy/lib/characterFormatter.js";
import { Mana } from "../../spells/lib/mana.js";
import type { LearnedRune } from "../service/runeService.js";
import { RUNE_ALPHABETS, RUNE_MAX_PROGRESS, RUNES } from "./runeCatalog.js";
import { RuneAction, RuneCustomIds } from "./runeCustomIds.js";

const ARROW = "<:48765whitearrow:1518587298281685173>";
const HEADER = "<:elder_ansuz:1562468430295334952>";
const PAD = "⠀".repeat(60);

export const RUNES_PER_PAGE = 5;

const STAGES: [number, string][] = [
  [100, "Мастерство"],
  [75, "Владение"],
  [50, "Практика"],
  [25, "Осмысление"],
  [0, "Знакомство"],
];

export class RuneContainer {
  public static picker(characters: Character[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${HEADER} Руны`,
          "",
          `${ARROW} Выберите персонажа, чьи руны хотите посмотреть.`,
          `-# ${PAD}`,
        ].join("\n"),
      ),
    );

    container.addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(RuneCustomIds.build(RuneAction.Pick))
          .setPlaceholder("Выберите персонажа")
          .addOptions(
            characters.slice(0, 25).map((character) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(character.rpName.slice(0, 100))
                .setDescription(CharacterFormatter.facultyLabel(character.faculty))
                .setEmoji(CharacterFormatter.facultyEmoji(character.faculty))
                .setValue(character.id),
            ),
          ),
      ),
    );

    return container;
  }

  public static view(
    character: Character,
    learned: LearnedRune[],
    page: number,
    canGoBack: boolean,
  ) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    const pages = Math.max(Math.ceil(learned.length / RUNES_PER_PAGE), 1);
    const current = Math.min(Math.max(page, 0), pages - 1);
    const shown = learned.slice(current * RUNES_PER_PAGE, (current + 1) * RUNES_PER_PAGE);

    const header = new TextDisplayBuilder().setContent(
      [
        `# ${HEADER} Руны · ${character.rpName}`,
        `-# Изучено рун: **${learned.length}** из ${RUNES.length}`,
        `-# ${PAD}`,
      ].join("\n"),
    );

    const avatar = Storage.media(character.avatarPath, character.avatarUrl);

    if (avatar) {
      container.addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(header)
          .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatar)),
      );
    } else {
      container.addTextDisplayComponents(header);
    }

    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
    );

    if (!learned.length) {
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            `${ARROW} Персонаж пока не изучил ни одной руны.`,
            "-# Руны изучаются на занятиях и в постах вместе с куратором — он отмечает прогресс изучения.",
          ].join("\n"),
        ),
      );
    }

    let alphabet: string | null = null;

    for (const entry of shown) {
      const lines: string[] = [];

      if (entry.rune.alphabet !== alphabet) {
        alphabet = entry.rune.alphabet;
        lines.push(`### ${RUNE_ALPHABETS[entry.rune.alphabet].label}`);
      }

      lines.push(
        `${entry.rune.emoji} **${entry.rune.name}** — ${entry.rune.meaning}`,
        `${Mana.format(entry.progress, RUNE_MAX_PROGRESS)}`,
        `-# ${this.stage(entry.progress)}`,
      );

      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join("\n")));
    }

    const row = new ActionRowBuilder<ButtonBuilder>();

    if (pages > 1) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(RuneCustomIds.build(RuneAction.Page, character.id, String(current - 1)))
          .setEmoji("<:172852arrowleft:1518587345249763452>")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(current === 0),
        new ButtonBuilder()
          .setCustomId("rune:counter")
          .setLabel(`${current + 1} / ${pages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(RuneCustomIds.build(RuneAction.Page, character.id, String(current + 1)))
          .setEmoji("<:383438arrowright:1518587353390907473>")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(current >= pages - 1),
      );
    }

    if (canGoBack) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(RuneCustomIds.build(RuneAction.Back))
          .setLabel("Другой персонаж")
          .setEmoji("<:26204blackarrow:1518587278467792997>")
          .setStyle(ButtonStyle.Secondary),
      );
    }

    if (row.components.length) {
      container.addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large),
      );

      container.addActionRowComponents(row);
    }

    return container;
  }

  public static notice(title: string, message: string) {
    return new ContainerBuilder()
      .setAccentColor(0x475b56)
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([`# ${title}`, "", `${ARROW} ${message}`].join("\n")),
      );
  }

  public static stage(progress: number) {
    return STAGES.find(([threshold]) => progress >= threshold)?.[1] ?? STAGES[STAGES.length - 1][1];
  }
}
