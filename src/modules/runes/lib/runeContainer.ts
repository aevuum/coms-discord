import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  LabelBuilder,
  ModalBuilder,
  SectionBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  ThumbnailBuilder,
} from "discord.js";

import {
  RuneFuthark,
  type Character,
  type Rune,
  type RuneStudyRequest,
} from "../../../database/generated/prisma/client.js";

import { Storage } from "../../../lib/storage.js";
import { CharacterFormatter } from "../../economy/lib/characterFormatter.js";
import type { AvailableFormula } from "../service/formulaService.js";
import type { LearnedRune } from "../service/runeService.js";
import { FUTHARK_DESCRIPTIONS, FUTHARK_LABELS, RUNE_MAX_MASTERY } from "./runeCatalog.js";
import { RuneAction, RuneCustomIds, RuneModalFields, RuneTab } from "./runeCustomIds.js";
import {
  REQUEST_STATUS_LABELS,
  RUNE_ARROW,
  RUNE_BACK,
  RUNE_ERROR,
  RUNE_HEADER,
  RUNE_PAD,
  RUNE_SUCCESS,
  RuneFormat,
} from "./runeFormat.js";
import { OUTCOME_LABELS } from "./runeRules.js";

export const RUNES_PER_PAGE = 5;

const TABS: { id: RuneTab; label: string; description: string; emoji: string }[] = [
  { id: RuneTab.Runes, label: "Мои руны", description: "Изученные руны и владение", emoji: RUNE_HEADER },
  { id: RuneTab.Catalog, label: "Справочник", description: "Все руны футарков и заявки на изучение", emoji: "<:6849serverguide:1518587250802426078>" },
  { id: RuneTab.Formulas, label: "Формулы", description: "Модификации заклинаний рунами", emoji: "<:wand:1562520778828677280>" },
  { id: RuneTab.Requests, label: "Заявки", description: "Статус заявок на изучение рун", emoji: "<:dot_yellow:1562262864939589673>" },
];

export type RuneTabData = {
  learned: LearnedRune[];
  runes: Rune[];
  formulas: AvailableFormula[];
  requests: (RuneStudyRequest & { rune: Rune })[];
};

const text = (container: ContainerBuilder, lines: (string | null | false)[]) =>
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(lines.filter((line): line is string => typeof line === "string").join("\n")),
  );

const back = (characterId: string, tab: RuneTab, label = "Назад") =>
  new ButtonBuilder()
    .setCustomId(RuneCustomIds.build(RuneAction.Page, characterId, tab, 0))
    .setLabel(label)
    .setEmoji(RUNE_BACK)
    .setStyle(ButtonStyle.Secondary);

export class RuneContainer {
  public static picker(characters: Character[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    text(container, [`# ${RUNE_HEADER} Руны`, "", `${RUNE_ARROW} Выберите персонажа.`, `-# ${RUNE_PAD}`]);

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
    tab: RuneTab,
    data: RuneTabData,
    page: number,
    canGoBack: boolean,
    notice: string | null = null,
  ) {
    const container = this.header(character, data, notice);

    container.addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(RuneCustomIds.build(RuneAction.Tab, character.id))
          .addOptions(
            TABS.map((entry) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(entry.label)
                .setDescription(entry.description)
                .setEmoji(entry.emoji)
                .setValue(entry.id)
                .setDefault(entry.id === tab),
            ),
          ),
      ),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    switch (tab) {
      case RuneTab.Catalog:
        this.catalogTab(container, character, data);
        break;
      case RuneTab.Formulas:
        this.formulasTab(container, character, data);
        break;
      case RuneTab.Requests:
        this.requestsTab(container, data);
        break;
      default:
        this.runesTab(container, character, data, page);
    }

    if (canGoBack) {
      container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));
      container.addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(RuneCustomIds.build(RuneAction.Back))
            .setLabel("Другой персонаж")
            .setEmoji(RUNE_BACK)
            .setStyle(ButtonStyle.Secondary),
        ),
      );
    }

    return container;
  }

  private static header(character: Character, data: RuneTabData, notice: string | null) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    const header = new TextDisplayBuilder().setContent(
      [
        `# ${RUNE_HEADER} Руны · ${character.rpName}`,
        `-# Изучено рун: **${data.learned.length}** из ${data.runes.length}`,
        notice ? `${RUNE_SUCCESS} ${notice}` : null,
        `-# ${RUNE_PAD}`,
      ]
        .filter((line) => line !== null)
        .join("\n"),
    );

    const avatar = Storage.media(character.avatarPath, character.avatarUrl);

    if (avatar) {
      container.addSectionComponents(
        new SectionBuilder().addTextDisplayComponents(header).setThumbnailAccessory(new ThumbnailBuilder().setURL(avatar)),
      );
    } else {
      container.addTextDisplayComponents(header);
    }

    return container;
  }

  private static runesTab(container: ContainerBuilder, character: Character, data: RuneTabData, page: number) {
    const { learned } = data;

    if (!learned.length) {
      text(container, [
        `${RUNE_ARROW} Персонаж пока не изучил ни одной руны.`,
        "-# Напишите RP-пост об изучении руны и подайте заявку во вкладке «Справочник» — куратор проверит пост и откроет руну.",
      ]);
      return;
    }

    const pages = Math.max(Math.ceil(learned.length / RUNES_PER_PAGE), 1);
    const current = Math.min(Math.max(page, 0), pages - 1);
    let futhark: RuneFuthark | null = null;

    for (const entry of learned.slice(current * RUNES_PER_PAGE, (current + 1) * RUNES_PER_PAGE)) {
      const lines: string[] = [];

      if (entry.rune.futhark !== futhark) {
        futhark = entry.rune.futhark;
        lines.push(`### ${FUTHARK_LABELS[entry.rune.futhark]}`);
      }

      lines.push(RuneFormat.runeTitle(entry.rune), RuneFormat.masteryBar(entry.mastery), `-# ${RuneFormat.stage(entry.mastery)}`);

      text(container, lines);
    }

    container.addActionRowComponents(this.runeSelect(character.id, learned.map((entry) => entry.rune), "Подробнее об изученной руне", learned));

    if (pages > 1) {
      container.addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder()
            .setCustomId(RuneCustomIds.build(RuneAction.Page, character.id, RuneTab.Runes, current - 1))
            .setEmoji("<:172852arrowleft:1518587345249763452>")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(current === 0),
          new ButtonBuilder()
            .setCustomId(RuneCustomIds.build(RuneAction.Page, character.id, "counter", 0))
            .setLabel(`${current + 1} / ${pages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(RuneCustomIds.build(RuneAction.Page, character.id, RuneTab.Runes, current + 1))
            .setEmoji("<:383438arrowright:1518587353390907473>")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(current >= pages - 1),
        ),
      );
    }
  }

  private static catalogTab(container: ContainerBuilder, character: Character, data: RuneTabData) {
    text(container, [
      `### ${FUTHARK_LABELS[RuneFuthark.ELDER]}`,
      `-# ${FUTHARK_DESCRIPTIONS[RuneFuthark.ELDER]}`,
      `### ${FUTHARK_LABELS[RuneFuthark.YOUNGER]}`,
      `-# ${FUTHARK_DESCRIPTIONS[RuneFuthark.YOUNGER]}`,
      "",
      `${RUNE_ARROW} Выберите руну, чтобы прочитать её принцип и подать заявку на изучение.`,
    ]);

    for (const futhark of [RuneFuthark.ELDER, RuneFuthark.YOUNGER]) {
      container.addActionRowComponents(
        this.runeSelect(
          character.id,
          data.runes.filter((rune) => rune.futhark === futhark),
          `${FUTHARK_LABELS[futhark]}: выберите руну`,
          data.learned,
          futhark,
        ),
      );
    }
  }

  private static formulasTab(container: ContainerBuilder, character: Character, data: RuneTabData) {
    text(container, [
      "### <:wand:1562520778828677280> Формулы модификации",
      data.formulas.length
        ? data.formulas
            .map(
              (entry) =>
                `${entry.allowed ? RUNE_SUCCESS : RUNE_ERROR} ${entry.formula.rune.emoji} **${entry.formula.incantation}** ← ${entry.formula.spell.name} · риск ${RuneFormat.risk(entry.risk)} · владение ${entry.mastery}/${entry.formula.minMastery}`,
            )
            .join("\n")
        : `${RUNE_ARROW} Для изученных рун пока нет утверждённых формул.`,
      "-# Формула — утверждённое сочетание руны и базового заклинания. Её прононс работает через туппер, если владение руной не ниже требуемого. Новые формулы регистрируют кураторы.",
    ]);

    if (data.formulas.length) {
      container.addActionRowComponents(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(RuneCustomIds.build(RuneAction.Formula, character.id))
            .setPlaceholder("Открыть формулу")
            .addOptions(
              data.formulas.map((entry) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(entry.formula.incantation.slice(0, 100))
                  .setDescription(`${entry.formula.spell.name} + ${entry.formula.rune.name} · риск ${entry.risk}%`.slice(0, 100))
                  .setEmoji(entry.formula.rune.emoji)
                  .setValue(entry.formula.id),
              ),
            ),
        ),
      );
    }
  }

  private static requestsTab(container: ContainerBuilder, data: RuneTabData) {
    text(container, [
      "### Заявки на изучение",
      data.requests.length
        ? data.requests
            .map(
              (request) =>
                `${request.rune.emoji} **${request.rune.name}** · ${REQUEST_STATUS_LABELS[request.status]}${request.reason ? `\n-# Причина: ${request.reason}` : ""}`,
            )
            .join("\n")
        : `${RUNE_ARROW} Заявок пока нет.`,
    ]);
  }

  private static runeSelect(
    characterId: string,
    runes: Rune[],
    placeholder: string,
    learned: LearnedRune[],
    suffix = "learned",
  ) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(RuneCustomIds.build(RuneAction.Info, characterId, suffix))
        .setPlaceholder(placeholder)
        .addOptions(
          runes.slice(0, 25).map((rune) => {
            const entry = learned.find((item) => item.rune.key === rune.key);

            return new StringSelectMenuOptionBuilder()
              .setLabel(`${rune.name} — ${rune.meaning}`.slice(0, 100))
              .setDescription(entry ? `Изучена · владение ${entry.mastery}/${RUNE_MAX_MASTERY}` : "Не изучена")
              .setEmoji(rune.emoji)
              .setValue(rune.key);
          }),
        ),
    );
  }

  public static runeInfo(
    character: Character,
    rune: Rune,
    mastery: number | null,
    pending: boolean,
  ) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    text(container, [
      `# ${rune.emoji} ${rune.name}`,
      ...RuneFormat.playerCard(rune),
      "",
      mastery !== null
        ? `**Владение ${character.rpName}:** ${RuneFormat.masteryBar(mastery)}\n-# ${RuneFormat.stage(mastery)}`
        : pending
          ? `${RUNE_ARROW} Заявка на изучение уже ждёт решения куратора.`
          : `${RUNE_ARROW} Руна не изучена. Напишите RP-пост: осмысление сути руны, правильная гравюра, практика начертания — и подайте заявку со ссылкой на пост.`,
      `-# ${RUNE_PAD}`,
    ]);

    const row = new ActionRowBuilder<ButtonBuilder>();

    if (mastery === null && !pending) {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(RuneCustomIds.build(RuneAction.Study, character.id, rune.key))
          .setLabel("Подать заявку на изучение")
          .setEmoji("<:12784editor:1518587261707616407>")
          .setStyle(ButtonStyle.Primary),
      );
    }

    row.addComponents(back(character.id, mastery !== null ? RuneTab.Runes : RuneTab.Catalog));
    container.addActionRowComponents(row);

    return container;
  }

  public static studyModal(characterId: string, rune: Rune) {
    return new ModalBuilder()
      .setCustomId(RuneCustomIds.build(RuneAction.StudyModal, characterId, rune.key))
      .setTitle(`Изучение руны ${rune.name}`.slice(0, 45))
      .addLabelComponents(
        new LabelBuilder()
          .setLabel("Ссылка на RP-пост")
          .setDescription("ПКМ по сообщению → «Копировать ссылку на сообщение»")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(RuneModalFields.PostUrl)
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(200)
              .setPlaceholder("https://discord.com/channels/…"),
          ),
        new LabelBuilder()
          .setLabel("Комментарий куратору")
          .setTextInputComponent(
            new TextInputBuilder()
              .setCustomId(RuneModalFields.Note)
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(false)
              .setMaxLength(500),
          ),
      );
  }

  public static formulaDetail(characterId: string, entry: AvailableFormula) {
    const { formula } = entry;
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    text(container, [
      `# ${formula.rune.emoji} ${formula.incantation}`,
      `-# ${formula.spell.name} (${formula.spell.incantations[0] ?? formula.spell.name}) + руна ${formula.rune.name}`,
      "",
      `> **Эффект:** ${formula.effect}`,
      formula.mechanics ? `> **Механика:** ${formula.mechanics}` : null,
      formula.restrictions ? `> **Ограничения:** ${formula.restrictions}` : null,
      "",
      `**Требуемое владение:** ${formula.minMastery} · **ваше:** ${entry.mastery}`,
      `**Сложность для вашего владения:** ${RuneFormat.risk(entry.risk)}`,
      `**Возможная неудача:** ${OUTCOME_LABELS[formula.failureOutcome]}`,
      entry.allowed ? null : `${RUNE_ERROR} Недостаточно владения руной ${formula.rune.name}.`,
      entry.allowed
        ? "-# Произнесите прононс через туппер — заклинание сработает как обычное и потратит ману."
        : "-# Пока владение ниже требуемого, прононс через туппер не сработает.",
      `-# ${RUNE_PAD}`,
    ]);

    container.addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(back(characterId, RuneTab.Formulas)));

    return container;
  }

  public static notice(title: string, message: string) {
    return new ContainerBuilder()
      .setAccentColor(0x475b56)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent([`# ${title}`, "", `${RUNE_ARROW} ${message}`].join("\n")));
  }

  public static stage(mastery: number) {
    return RuneFormat.stage(mastery);
  }
}
