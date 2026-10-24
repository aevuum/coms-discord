import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
} from "discord.js";

import {
  RuneDesignStatus,
  RuneFuthark,
  type ArtifactBlank,
  type ArtifactMaterial,
  type Rune,
  type RuneSettings,
} from "../../../database/generated/prisma/client.js";

import { ManageComponents } from "../../manage/lib/manageComponents.js";
import type { RecipeWithRelations } from "../service/artifactService.js";
import { AUDIT_LABELS } from "../service/runeAudit.js";
import type { FormulaWithRelations } from "../service/formulaService.js";
import type { RuneService } from "../service/runeService.js";
import type { RuneAudit } from "../service/runeAudit.js";
import { FUTHARK_LABELS } from "./runeCatalog.js";
import { RuneAdminAction, RuneAdminCustomIds, RuneAdminSection } from "./runeAdminCustomIds.js";
import {
  DESIGN_STATUS_DOTS,
  DESIGN_STATUS_LABELS,
  RUNE_ARROW,
  RUNE_BACK,
  RUNE_HEADER,
  RUNE_PAD,
  RUNE_SUCCESS,
  RuneFormat,
} from "./runeFormat.js";
import { OUTCOME_LABELS, RuneRules } from "./runeRules.js";

type StudyRequest = Awaited<ReturnType<typeof RuneService.pendingRequests>>[number];
type AuditRecord = Awaited<ReturnType<typeof RuneAudit.recent>>[number];

export type RuneAdminCounts = {
  requests: number;
  formulas: number;
  recipes: number;
};

const SECTIONS: { id: RuneAdminSection; label: string; description: string; emoji: string }[] = [
  { id: RuneAdminSection.Requests, label: "Заявки на изучение", description: "Подтверждение и отклонение изучения рун", emoji: "<:12784editor:1518587261707616407>" },
  { id: RuneAdminSection.Formulas, label: "Формулы заклинаний", description: "Утверждение, правка и отключение модификаций", emoji: "<:wand:1562520778828677280>" },
  { id: RuneAdminSection.Recipes, label: "Рецепты артефактов", description: "Руны, заготовка, материалы и риски", emoji: "<:inventory:1562485572008673340>" },
  { id: RuneAdminSection.Runes, label: "Справочник рун", description: "Принципы, применение, нагрузка", emoji: RUNE_HEADER },
  { id: RuneAdminSection.Materials, label: "Материалы", description: "Бонусы вместимости", emoji: "<:8833bluecrystal:1519584996090712174>" },
  { id: RuneAdminSection.Blanks, label: "Заготовки", description: "Базовая вместимость и качество", emoji: "<:sec_shop:1562521793691131955>" },
  { id: RuneAdminSection.Settings, label: "Настройки", description: "Коэффициенты нагрузки и риска", emoji: "<:479873settingsna:1518581042456432791>" },
  { id: RuneAdminSection.History, label: "Журнал", description: "Кто что изучил, утвердил и создал", emoji: "<:988044dots:1518581053642772621>" },
];

const button = (action: RuneAdminAction, label: string, style: ButtonStyle, emoji: string, ...args: string[]) =>
  new ButtonBuilder()
    .setCustomId(RuneAdminCustomIds.build(action, ...args))
    .setLabel(label)
    .setEmoji(emoji)
    .setStyle(style);

const sectionButton = (section: RuneAdminSection, label = "Назад") =>
  new ButtonBuilder()
    .setCustomId(RuneAdminCustomIds.build(RuneAdminAction.Root, section))
    .setLabel(label)
    .setEmoji(RUNE_BACK)
    .setStyle(ButtonStyle.Secondary);

export class RuneAdminContainer {
  private static base(title: string, lines: (string | null | false)[], notice: string | null = null) {
    return new ContainerBuilder().setAccentColor(0x475b56).addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `# ${title}`,
          notice ? `${RUNE_SUCCESS} ${notice}` : null,
          ...lines,
          `-# ${RUNE_PAD}`,
        ]
          .filter((line): line is string => typeof line === "string")
          .join("\n"),
      ),
    );
  }

  private static nav(container: ContainerBuilder, ...extra: ButtonBuilder[]) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large));
    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        ...extra,
        new ButtonBuilder()
          .setCustomId(RuneAdminCustomIds.build(RuneAdminAction.Root))
          .setLabel("Разделы рун")
          .setEmoji(RUNE_HEADER)
          .setStyle(ButtonStyle.Secondary),
        ManageComponents.homeButton(),
      ),
    );

    return container;
  }

  private static select(action: RuneAdminAction, placeholder: string, options: StringSelectMenuOptionBuilder[], ...args: string[]) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(RuneAdminCustomIds.build(action, ...args))
        .setPlaceholder(placeholder)
        .addOptions(options.slice(0, 25)),
    );
  }

  public static root(counts: RuneAdminCounts, notice: string | null = null) {
    const container = this.base(`${RUNE_HEADER} Руны и артефакты`, [
      "",
      `${RUNE_ARROW} Заявок на изучение: **${counts.requests}**`,
      `${RUNE_ARROW} Формул на проверке: **${counts.formulas}**`,
      `${RUNE_ARROW} Рецептов на проверке: **${counts.recipes}**`,
      "-# Игроки изучают руны через RP-посты и подают заявки в /rune. Куратор подтверждает изучение, повышает владение и утверждает формулы и рецепты — бот проверяет требования, считает риск и хранит историю.",
    ], notice);

    container.addActionRowComponents(
      this.select(
        RuneAdminAction.Section,
        "Выберите раздел",
        SECTIONS.map((section) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(section.label)
            .setDescription(section.description)
            .setEmoji(section.emoji)
            .setValue(section.id),
        ),
      ),
    );

    container.addActionRowComponents(ManageComponents.homeRow());

    return container;
  }

  public static requests(requests: StudyRequest[], notice: string | null = null) {
    const container = this.base("<:12784editor:1518587261707616407> Заявки на изучение", [
      "",
      requests.length
        ? requests
            .map((request) => `${request.rune.emoji} **${request.rune.name}** · ${request.character.rpName} · <t:${Math.floor(request.createdAt.getTime() / 1000)}:R>`)
            .join("\n")
        : `${RUNE_ARROW} Новых заявок нет.`,
    ], notice);

    if (requests.length) {
      container.addActionRowComponents(
        this.select(
          RuneAdminAction.Request,
          "Открыть заявку",
          requests.map((request) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(`${request.rune.name} · ${request.character.rpName}`.slice(0, 100))
              .setEmoji(request.rune.emoji)
              .setValue(request.id),
          ),
        ),
      );
    }

    return this.nav(container);
  }

  public static request(request: StudyRequest, settings: RuneSettings) {
    const container = this.base(`${request.rune.emoji} Изучение руны ${request.rune.name}`, [
      `-# ${FUTHARK_LABELS[request.rune.futhark]} · ${request.rune.meaning}`,
      "",
      `**Персонаж:** ${request.character.rpName} · <@${request.character.user.discordId}>`,
      `**RP-пост:** ${request.postUrl}`,
      request.note ? `**Комментарий:** ${request.note}` : null,
      `**Подано:** <t:${Math.floor(request.createdAt.getTime() / 1000)}:f>`,
      `-# При подтверждении руна откроется персонажу с начальным владением (по умолчанию ${settings.defaultInitialMastery}).`,
    ]);

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        button(RuneAdminAction.RequestApprove, "Подтвердить изучение", ButtonStyle.Success, RUNE_SUCCESS, request.id),
        button(RuneAdminAction.RequestReject, "Отклонить", ButtonStyle.Danger, "<:240191mark:1518581039172292688>", request.id),
      ),
    );

    return this.nav(container, sectionButton(RuneAdminSection.Requests));
  }

  public static formulas(formulas: FormulaWithRelations[], notice: string | null = null) {
    const container = this.base("<:wand:1562520778828677280> Формулы заклинаний", [
      "",
      formulas.length
        ? formulas
            .map((formula) => `${DESIGN_STATUS_DOTS[formula.status]} ${formula.rune.emoji} **${formula.incantation}** ← ${formula.spell.name} · ${DESIGN_STATUS_LABELS[formula.status]}`)
            .join("\n")
        : `${RUNE_ARROW} Формул пока нет.`,
      "-# Формула — утверждённое сочетание руны и базового заклинания. Неутверждённые и отключённые формулы использовать нельзя.",
    ], notice);

    if (formulas.length) {
      container.addActionRowComponents(
        this.select(
          RuneAdminAction.Formula,
          "Открыть формулу",
          formulas.map((formula) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(formula.incantation.slice(0, 100))
              .setDescription(`${formula.spell.name} + ${formula.rune.name} · ${DESIGN_STATUS_LABELS[formula.status]}`.slice(0, 100))
              .setEmoji(formula.rune.emoji)
              .setValue(formula.id),
          ),
        ),
      );
    }

    return this.nav(container, button(RuneAdminAction.FormulaCreate, "Новая формула", ButtonStyle.Success, "<:6509addguild:1518587247769817088>"));
  }

  public static formula(formula: FormulaWithRelations, settings: RuneSettings, notice: string | null = null) {
    const riskAt = (mastery: number) =>
      RuneRules.risk({ baseRisk: formula.baseRisk, complexity: formula.complexity, mastery }, settings);

    const container = this.base(`${formula.rune.emoji} ${formula.incantation}`, [
      `-# ${DESIGN_STATUS_DOTS[formula.status]} ${DESIGN_STATUS_LABELS[formula.status]}${formula.authorCharacter ? ` · предложил ${formula.authorCharacter.rpName}` : ""}`,
      "",
      `**Базовое заклинание:** ${formula.spell.name} (${formula.spell.incantations.join(", ")})`,
      `**Руна:** ${formula.rune.name} — ${formula.rune.principle ?? formula.rune.meaning}`,
      `> **Эффект:** ${formula.effect}`,
      formula.mechanics ? `> **Механика:** ${formula.mechanics}` : null,
      formula.restrictions ? `> **Ограничения:** ${formula.restrictions}` : null,
      "",
      `**Владение:** от ${formula.minMastery} · **риск:** база ${formula.baseRisk} + сложность ${formula.complexity}`,
      `**Риск при владении** ${formula.minMastery} / 50 / 100: ${riskAt(formula.minMastery)}% / ${riskAt(50)}% / ${riskAt(100)}%`,
      `**При неудаче:** ${OUTCOME_LABELS[formula.failureOutcome]}`,
      formula.reviewReason ? `**Причина отказа:** ${formula.reviewReason}` : null,
    ], notice);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      button(RuneAdminAction.FormulaApprove, formula.status === RuneDesignStatus.APPROVED ? "Параметры" : "Утвердить", ButtonStyle.Success, RUNE_SUCCESS, formula.id),
      button(RuneAdminAction.FormulaEdit, "Изменить текст", ButtonStyle.Primary, "<:984149edit:1518587370474176612>", formula.id),
    );

    if (formula.status === RuneDesignStatus.PENDING || formula.status === RuneDesignStatus.DRAFT) {
      row.addComponents(button(RuneAdminAction.FormulaReject, "Отклонить", ButtonStyle.Danger, "<:240191mark:1518581039172292688>", formula.id));
    }

    if (formula.status === RuneDesignStatus.APPROVED || formula.status === RuneDesignStatus.DISABLED) {
      row.addComponents(
        button(
          RuneAdminAction.FormulaToggle,
          formula.status === RuneDesignStatus.APPROVED ? "Отключить" : "Включить",
          ButtonStyle.Secondary,
          "<:dot_white:1562262867846373436>",
          formula.id,
        ),
      );
    }

    container.addActionRowComponents(row);

    return this.nav(container, sectionButton(RuneAdminSection.Formulas));
  }

  public static recipes(recipes: { recipe: RecipeWithRelations; load: number; capacity: number }[], notice: string | null = null) {
    const container = this.base("<:inventory:1562485572008673340> Рецепты артефактов", [
      "",
      recipes.length
        ? recipes
            .map(({ recipe, load, capacity }) => `${DESIGN_STATUS_DOTS[recipe.status]} **${recipe.name}** · ${recipe.blank.name} · нагрузка ${load}/${capacity} · ${DESIGN_STATUS_LABELS[recipe.status]}`)
            .join("\n")
        : `${RUNE_ARROW} Рецептов пока нет. Сначала добавьте заготовки и материалы.`,
    ], notice);

    if (recipes.length) {
      container.addActionRowComponents(
        this.select(
          RuneAdminAction.Recipe,
          "Открыть рецепт",
          recipes.map(({ recipe }) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(recipe.name.slice(0, 100))
              .setDescription(`${recipe.runes.map((entry) => entry.rune.name).join(", ")} · ${DESIGN_STATUS_LABELS[recipe.status]}`.slice(0, 100))
              .setValue(recipe.id),
          ),
        ),
      );
    }

    return this.nav(container, button(RuneAdminAction.RecipeCreate, "Новый рецепт", ButtonStyle.Success, "<:6509addguild:1518587247769817088>"));
  }

  public static recipe(recipe: RecipeWithRelations, load: number, capacity: number, settings: RuneSettings, notice: string | null = null) {
    const container = this.base(`<:inventory:1562485572008673340> ${recipe.name}`, [
      `-# ${DESIGN_STATUS_DOTS[recipe.status]} ${DESIGN_STATUS_LABELS[recipe.status]}`,
      `> ${recipe.effect}`,
      "",
      `**Заготовка:** ${recipe.blank.name} (база ${recipe.blank.baseCapacity}, качество ${recipe.blank.qualityPercent}%)`,
      `**Руны:** ${recipe.runes.map((entry) => `${entry.rune.emoji} ${entry.rune.name}${entry.critical ? "*" : ""} (${RuneRules.runeLoad(entry.rune, settings)})`).join(", ")}`,
      `**Материалы:** ${recipe.materials.length ? recipe.materials.map((entry) => `${entry.material.name} ×${entry.quantity} (+${entry.material.capacityBonus * entry.quantity})`).join(", ") : "нет"}`,
      `**Нагрузка / вместимость:** ${load} / ${capacity}${load > capacity ? " · перегрузка без дополнительных материалов" : ""}`,
      `**Владение:** от ${recipe.minMastery} · **риск:** база ${recipe.baseRisk} + сложность ${recipe.complexity}`,
      `**При неудаче:** ${OUTCOME_LABELS[recipe.failureOutcome]}`,
      `**При перегрузке:** ${OUTCOME_LABELS[recipe.overloadOutcome]}`,
      recipe.reviewReason ? `**Причина отказа:** ${recipe.reviewReason}` : null,
      "-# * — критическая руна: риск считается по слабейшей критической руне.",
    ], notice);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      button(RuneAdminAction.RecipeApprove, recipe.status === RuneDesignStatus.APPROVED ? "Параметры" : "Утвердить", ButtonStyle.Success, RUNE_SUCCESS, recipe.id),
      button(RuneAdminAction.RecipeEdit, "Изменить", ButtonStyle.Primary, "<:984149edit:1518587370474176612>", recipe.id),
    );

    if (recipe.status === RuneDesignStatus.PENDING || recipe.status === RuneDesignStatus.DRAFT) {
      row.addComponents(button(RuneAdminAction.RecipeReject, "Отклонить", ButtonStyle.Danger, "<:240191mark:1518581039172292688>", recipe.id));
    }

    if (recipe.status === RuneDesignStatus.APPROVED || recipe.status === RuneDesignStatus.DISABLED) {
      row.addComponents(
        button(RuneAdminAction.RecipeToggle, recipe.status === RuneDesignStatus.APPROVED ? "Отключить" : "Включить", ButtonStyle.Secondary, "<:dot_white:1562262867846373436>", recipe.id),
      );
    }

    container.addActionRowComponents(row);

    return this.nav(container, sectionButton(RuneAdminSection.Recipes));
  }

  public static runes(runes: Rune[], settings: RuneSettings) {
    const filled = runes.filter((rune) => rune.principle).length;

    const container = this.base(`${RUNE_HEADER} Справочник рун`, [
      "",
      `${RUNE_ARROW} Описано подробно: **${filled}** из ${runes.length}. Остальные ждут, пока кураторы утвердят их принципы.`,
      `${RUNE_ARROW} Нагрузка по умолчанию: старший футарк **${settings.elderLoad}**, младший **${settings.youngerLoad}** — у отдельной руны можно задать свою.`,
    ]);

    for (const futhark of [RuneFuthark.ELDER, RuneFuthark.YOUNGER]) {
      container.addActionRowComponents(
        this.select(
          RuneAdminAction.Rune,
          `${FUTHARK_LABELS[futhark]}: выберите руну`,
          runes
            .filter((rune) => rune.futhark === futhark)
            .map((rune) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(`${rune.name} — ${rune.meaning}`.slice(0, 100))
                .setDescription(`${rune.principle ? "описана" : "без описания"} · нагрузка ${RuneRules.runeLoad(rune, settings)}`)
                .setEmoji(rune.emoji)
                .setValue(rune.key),
            ),
          futhark,
        ),
      );
    }

    return this.nav(container);
  }

  public static rune(rune: Rune, settings: RuneSettings, notice: string | null = null) {
    const container = this.base(`${rune.emoji} ${rune.name}`, RuneFormat.runeCard(rune, settings), notice);

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        button(RuneAdminAction.RuneText, "Принцип и применение", ButtonStyle.Primary, "<:984149edit:1518587370474176612>", rune.key),
        button(RuneAdminAction.RuneMeta, "Значение и нагрузка", ButtonStyle.Secondary, "<:479873settingsna:1518581042456432791>", rune.key),
      ),
    );

    return this.nav(container, sectionButton(RuneAdminSection.Runes));
  }

  public static materials(materials: ArtifactMaterial[], notice: string | null = null) {
    const container = this.base("<:8833bluecrystal:1519584996090712174> Материалы", [
      "",
      materials.length
        ? materials.map((material) => `${RUNE_ARROW} **${material.name}** · вместимость ${material.capacityBonus >= 0 ? "+" : ""}${material.capacityBonus}`).join("\n")
        : `${RUNE_ARROW} Материалов пока нет.`,
      "-# Игрок тратит материалы из инвентаря персонажа: предмет в инвентаре должен называться так же, как материал.",
    ], notice);

    if (materials.length) {
      container.addActionRowComponents(
        this.select(
          RuneAdminAction.Material,
          "Открыть материал",
          materials.map((material) => new StringSelectMenuOptionBuilder().setLabel(material.name.slice(0, 100)).setValue(material.id)),
        ),
      );
    }

    return this.nav(container, button(RuneAdminAction.MaterialCreate, "Новый материал", ButtonStyle.Success, "<:6509addguild:1518587247769817088>"));
  }

  public static material(material: ArtifactMaterial) {
    const container = this.base(`<:8833bluecrystal:1519584996090712174> ${material.name}`, [
      material.description ? `> ${material.description}` : null,
      `**Бонус вместимости:** ${material.capacityBonus >= 0 ? "+" : ""}${material.capacityBonus}`,
    ]);

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        button(RuneAdminAction.MaterialEdit, "Изменить", ButtonStyle.Primary, "<:984149edit:1518587370474176612>", material.id),
        button(RuneAdminAction.MaterialDelete, "Удалить", ButtonStyle.Danger, "<:14605delete:1518587266505642074>", material.id),
      ),
    );

    return this.nav(container, sectionButton(RuneAdminSection.Materials));
  }

  public static blanks(blanks: ArtifactBlank[], notice: string | null = null) {
    const container = this.base("<:sec_shop:1562521793691131955> Заготовки", [
      "",
      blanks.length
        ? blanks
            .map((blank) => `${RUNE_ARROW} **${blank.name}**${blank.kind ? ` (${blank.kind})` : ""} · вместимость ${blank.baseCapacity} × ${blank.qualityPercent}%`)
            .join("\n")
        : `${RUNE_ARROW} Заготовок пока нет.`,
      "-# Заготовка тоже списывается из инвентаря персонажа по названию.",
    ], notice);

    if (blanks.length) {
      container.addActionRowComponents(
        this.select(
          RuneAdminAction.Blank,
          "Открыть заготовку",
          blanks.map((blank) => new StringSelectMenuOptionBuilder().setLabel(blank.name.slice(0, 100)).setValue(blank.id)),
        ),
      );
    }

    return this.nav(container, button(RuneAdminAction.BlankCreate, "Новая заготовка", ButtonStyle.Success, "<:6509addguild:1518587247769817088>"));
  }

  public static blank(blank: ArtifactBlank) {
    const container = this.base(`<:sec_shop:1562521793691131955> ${blank.name}`, [
      blank.kind ? `-# ${blank.kind}` : null,
      blank.description ? `> ${blank.description}` : null,
      `**Базовая вместимость:** ${blank.baseCapacity}`,
      `**Качество заготовки:** ${blank.qualityPercent}%`,
      `**Итоговая вместимость без материалов:** ${RuneRules.capacity({ baseCapacity: blank.baseCapacity, qualityPercent: blank.qualityPercent, bonuses: [] })}`,
    ]);

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        button(RuneAdminAction.BlankEdit, "Изменить", ButtonStyle.Primary, "<:984149edit:1518587370474176612>", blank.id),
        button(RuneAdminAction.BlankDelete, "Удалить", ButtonStyle.Danger, "<:14605delete:1518587266505642074>", blank.id),
      ),
    );

    return this.nav(container, sectionButton(RuneAdminSection.Blanks));
  }

  public static settings(settings: RuneSettings, notice: string | null = null) {
    const container = this.base("<:479873settingsna:1518581042456432791> Настройки рун", [
      "",
      `**Нагрузка руны по умолчанию:** старший футарк ${settings.elderLoad}, младший ${settings.youngerLoad}`,
      `**Снижение риска от владения:** ${settings.masteryReductionPct}% от владения (100 владения = −${settings.masteryReductionPct} к риску)`,
      `**Границы риска:** ${settings.minRisk}–${settings.maxRisk}%`,
      `**Начальное владение при подтверждении:** ${settings.defaultInitialMastery}`,
      `**Базовый риск новых формул и рецептов:** ${settings.defaultBaseRisk}`,
      "",
      "-# Риск неудачи = clamp(базовый риск + сложность − снижение от владения, нижняя граница, верхняя граница). Для артефактов берётся владение слабейшей критической руны.",
      "-# Вместимость = (база заготовки + бонусы материалов) × качество заготовки. Нагрузка = сумма нагрузок рун.",
    ], notice);

    return this.nav(container, button(RuneAdminAction.SettingsEdit, "Изменить", ButtonStyle.Primary, "<:984149edit:1518587370474176612>"));
  }

  public static history(entries: AuditRecord[], runes: Rune[]) {
    const runeName = (key: string) => runes.find((rune) => rune.key === key)?.name ?? key;

    const container = this.base("<:988044dots:1518581053642772621> Журнал рун", [
      "",
      entries.length
        ? entries
            .map((entry) => {
              const change = entry.fromValue !== null || entry.toValue !== null ? ` (${entry.fromValue ?? "—"} → ${entry.toValue ?? "—"})` : "";

              return `-# <t:${Math.floor(entry.createdAt.getTime() / 1000)}:d>\n${RUNE_ARROW} <@${entry.actorId}> · ${AUDIT_LABELS[entry.action]}${entry.character ? ` · ${entry.character.rpName}` : ""}${entry.runeKey ? ` · ${runeName(entry.runeKey)}` : ""}${change}${entry.note ? ` · ${entry.note.slice(0, 80)}` : ""}`;
            })
            .join("\n")
        : `${RUNE_ARROW} Записей пока нет.`,
      "-# Для броска формулы и создания артефакта в скобках — риск → результат броска.",
    ]);

    return this.nav(container);
  }
}
