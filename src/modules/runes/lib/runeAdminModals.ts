import {
  LabelBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";

import type {
  ArtifactBlank,
  ArtifactMaterial,
  Rune,
  RuneOutcome,
  RuneSettings,
} from "../../../database/generated/prisma/client.js";

import type { RecipeWithRelations } from "../service/artifactService.js";
import type { FormulaWithRelations } from "../service/formulaService.js";
import { RuneAdminAction, RuneAdminCustomIds, RuneAdminFields } from "./runeAdminCustomIds.js";
import {
  ARTIFACT_FAILURE_OUTCOMES,
  ARTIFACT_OVERLOAD_OUTCOMES,
  FORMULA_OUTCOMES,
  OUTCOME_LABELS,
} from "./runeRules.js";

type InputOptions = {
  style?: TextInputStyle;
  required?: boolean;
  max?: number;
  value?: string | number | null;
  placeholder?: string;
};

const input = (id: string, options: InputOptions = {}) => {
  const field = new TextInputBuilder()
    .setCustomId(id)
    .setStyle(options.style ?? TextInputStyle.Short)
    .setRequired(options.required ?? false)
    .setMaxLength(options.max ?? 100);

  if (options.value !== null && options.value !== undefined && String(options.value).length) {
    field.setValue(String(options.value).slice(0, options.max ?? 100));
  }

  if (options.placeholder) {
    field.setPlaceholder(options.placeholder);
  }

  return field;
};

const label = (text: string, field: TextInputBuilder, description?: string) => {
  const builder = new LabelBuilder().setLabel(text).setTextInputComponent(field);

  return description ? builder.setDescription(description) : builder;
};

const outcomeSelect = (id: string, outcomes: RuneOutcome[], current: RuneOutcome) =>
  new StringSelectMenuBuilder()
    .setCustomId(id)
    .setRequired(true)
    .addOptions(
      outcomes.map((outcome) =>
        new StringSelectMenuOptionBuilder()
          .setLabel(OUTCOME_LABELS[outcome].slice(0, 100))
          .setValue(outcome)
          .setDefault(outcome === current),
      ),
    );

const modal = (action: RuneAdminAction, title: string, ...args: string[]) =>
  new ModalBuilder().setCustomId(RuneAdminCustomIds.build(action, ...args)).setTitle(title.slice(0, 45));

export class RuneAdminModals {
  public static approveRequest(requestId: string, settings: RuneSettings) {
    return modal(RuneAdminAction.RequestApproveModal, "Подтверждение изучения", requestId).addLabelComponents(
      label(
        "Начальное владение (0–100)",
        input(RuneAdminFields.Mastery, { max: 3, value: settings.defaultInitialMastery }),
        "Насколько персонаж освоил руну по итогам поста",
      ),
    );
  }

  public static attemptReview(attemptId: string, success: boolean) {
    return modal(
      RuneAdminAction.AttemptReviewModal,
      success ? "Заклинание получилось" : "Заклинание не получилось",
      attemptId,
      success ? "1" : "0",
    ).addLabelComponents(
      label(
        "Что произошло",
        input(RuneAdminFields.Verdict, { style: TextInputStyle.Paragraph, required: true, max: 1500 }),
        success ? "Опишите, как проявился эффект" : "Опишите, что пошло не так и чем это обернулось",
      ),
    );
  }

  public static reason(action: RuneAdminAction, id: string, title: string) {
    return modal(action, title, id).addLabelComponents(
      label("Причина", input(RuneAdminFields.Reason, { style: TextInputStyle.Paragraph, required: true, max: 500 }), "Игрок увидит её в /rune"),
    );
  }

  public static formulaCreate() {
    return modal(RuneAdminAction.FormulaCreateModal, "Новая формула").addLabelComponents(
      label("Базовое заклинание", input(RuneAdminFields.Spell, { required: true, max: 80, placeholder: "Инсендио" })),
      label("Руна", input(RuneAdminFields.Rune, { required: true, max: 40, placeholder: "Альгиз" }), "Название руны"),
      label("Новый прононс", input(RuneAdminFields.Incantation, { required: true, max: 80, placeholder: "Альгиз Инсендио" })),
      label("Эффект", input(RuneAdminFields.Effect, { style: TextInputStyle.Paragraph, required: true, max: 1000 })),
      label("Механика изменения", input(RuneAdminFields.Mechanics, { style: TextInputStyle.Paragraph, max: 1000 }), "Цели, мощность, радиус, длительность, форма, условия"),
    );
  }

  public static formulaEdit(formula: FormulaWithRelations) {
    return modal(RuneAdminAction.FormulaEditModal, `Формула · ${formula.incantation}`, formula.id).addLabelComponents(
      label("Прононс", input(RuneAdminFields.Incantation, { required: true, max: 80, value: formula.incantation })),
      label("Эффект", input(RuneAdminFields.Effect, { style: TextInputStyle.Paragraph, required: true, max: 1000, value: formula.effect })),
      label("Механика изменения", input(RuneAdminFields.Mechanics, { style: TextInputStyle.Paragraph, max: 1000, value: formula.mechanics })),
      label("Ограничения", input(RuneAdminFields.Restrictions, { style: TextInputStyle.Paragraph, max: 1000, value: formula.restrictions }), "Цели, дальность, условия исполнения, позиционный смысл прононса"),
    );
  }

  public static formulaApprove(formula: FormulaWithRelations) {
    return modal(RuneAdminAction.FormulaApproveModal, `Утвердить · ${formula.incantation}`, formula.id).addLabelComponents(
      label("Минимальное владение руной", input(RuneAdminFields.MinMastery, { max: 3, value: formula.minMastery })),
      label("Базовый риск, %", input(RuneAdminFields.BaseRisk, { max: 3, value: formula.baseRisk })),
      label("Сложность сочетания, %", input(RuneAdminFields.Complexity, { max: 3, value: formula.complexity }), "Надбавка к риску"),
      new LabelBuilder()
        .setLabel("Последствие неудачи")
        .setStringSelectMenuComponent(outcomeSelect(RuneAdminFields.FailureOutcome, FORMULA_OUTCOMES, formula.failureOutcome)),
    );
  }

  public static recipe(blanks: ArtifactBlank[], recipe: RecipeWithRelations | null) {
    const blank = new StringSelectMenuBuilder()
      .setCustomId(RuneAdminFields.Blank)
      .setRequired(true)
      .setPlaceholder("Заготовка")
      .addOptions(
        blanks.slice(0, 25).map((entry) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(entry.name.slice(0, 100))
            .setDescription(`Вместимость ${entry.baseCapacity} × ${entry.qualityPercent}%`)
            .setValue(entry.name)
            .setDefault(recipe?.blankId === entry.id),
        ),
      );

    return modal(RuneAdminAction.RecipeSaveModal, recipe ? `Рецепт · ${recipe.name}` : "Новый рецепт", recipe?.id ?? "new").addLabelComponents(
      label("Название артефакта", input(RuneAdminFields.Name, { required: true, max: 80, value: recipe?.name })),
      label("Эффект", input(RuneAdminFields.Effect, { style: TextInputStyle.Paragraph, required: true, max: 1000, value: recipe?.effect })),
      new LabelBuilder().setLabel("Заготовка").setStringSelectMenuComponent(blank),
      label(
        "Руны",
        input(RuneAdminFields.Runes, {
          required: true,
          max: 300,
          value: recipe?.runes.map((entry) => `${entry.rune.name}${entry.critical ? "*" : ""}`).join(", "),
          placeholder: "Альгиз*, Науд, Фе",
        }),
        "Через запятую; * — критическая руна",
      ),
      label(
        "Обязательные материалы",
        input(RuneAdminFields.Materials, {
          max: 300,
          value: recipe?.materials.map((entry) => `${entry.material.name}${entry.quantity > 1 ? ` x${entry.quantity}` : ""}`).join(", "),
          placeholder: "Серебро x2, Лунный камень",
        }),
        "Через запятую, количество через x",
      ),
    );
  }

  public static recipeApprove(recipe: RecipeWithRelations) {
    return modal(RuneAdminAction.RecipeApproveModal, `Утвердить · ${recipe.name}`, recipe.id).addLabelComponents(
      label("Минимальное владение каждой руной", input(RuneAdminFields.MinMastery, { max: 3, value: recipe.minMastery })),
      label("Базовый риск, %", input(RuneAdminFields.BaseRisk, { max: 3, value: recipe.baseRisk })),
      label("Сложность сочетания, %", input(RuneAdminFields.Complexity, { max: 3, value: recipe.complexity })),
      new LabelBuilder()
        .setLabel("При перегрузке вместимости")
        .setStringSelectMenuComponent(outcomeSelect(RuneAdminFields.OverloadOutcome, ARTIFACT_OVERLOAD_OUTCOMES, recipe.overloadOutcome)),
      new LabelBuilder()
        .setLabel("При неудачном броске")
        .setStringSelectMenuComponent(outcomeSelect(RuneAdminFields.FailureOutcome, ARTIFACT_FAILURE_OUTCOMES, recipe.failureOutcome)),
    );
  }

  public static runeText(rune: Rune) {
    const text = (id: string, value: string | null, title: string) =>
      label(title, input(id, { style: TextInputStyle.Paragraph, max: 600, value }));

    return modal(RuneAdminAction.RuneTextModal, `Руна ${rune.name}`, rune.key).addLabelComponents(
      text(RuneAdminFields.Domain, rune.domain, "Основная область"),
      text(RuneAdminFields.Principle, rune.principle, "Магический принцип"),
      text(RuneAdminFields.Modifies, rune.modifies, "Какие свойства меняет"),
      text(RuneAdminFields.SpellUse, rune.spellUse, "Применение в заклинаниях"),
      text(RuneAdminFields.ArtifactUse, rune.artifactUse, "Применение в артефактах"),
    );
  }

  public static runeMeta(rune: Rune) {
    return modal(RuneAdminAction.RuneMetaModal, `Руна ${rune.name}`, rune.key).addLabelComponents(
      label("Основное значение", input(RuneAdminFields.Meaning, { required: true, max: 120, value: rune.meaning })),
      label("Нагрузка в артефакте", input(RuneAdminFields.Load, { max: 2, value: rune.load }), "Пусто — по футарку из настроек"),
      label("Ограничения и совместимость", input(RuneAdminFields.Restrictions, { style: TextInputStyle.Paragraph, max: 600, value: rune.restrictions })),
    );
  }

  public static material(material: ArtifactMaterial | null) {
    return modal(RuneAdminAction.MaterialSaveModal, material ? `Материал · ${material.name}` : "Новый материал", material?.id ?? "new").addLabelComponents(
      label("Название", input(RuneAdminFields.Name, { required: true, max: 80, value: material?.name }), "Так же должен называться предмет в инвентаре"),
      label("Бонус вместимости", input(RuneAdminFields.CapacityBonus, { required: true, max: 4, value: material?.capacityBonus ?? 1 }), "От −100 до 100"),
      label("Описание", input(RuneAdminFields.Description, { style: TextInputStyle.Paragraph, max: 500, value: material?.description })),
    );
  }

  public static blank(blank: ArtifactBlank | null) {
    return modal(RuneAdminAction.BlankSaveModal, blank ? `Заготовка · ${blank.name}` : "Новая заготовка", blank?.id ?? "new").addLabelComponents(
      label("Название", input(RuneAdminFields.Name, { required: true, max: 80, value: blank?.name }), "Так же должен называться предмет в инвентаре"),
      label("Тип предмета", input(RuneAdminFields.Kind, { max: 60, value: blank?.kind, placeholder: "Кольцо, амулет, плащ…" })),
      label("Базовая вместимость", input(RuneAdminFields.BaseCapacity, { required: true, max: 4, value: blank?.baseCapacity ?? 6 })),
      label("Качество заготовки, %", input(RuneAdminFields.Quality, { max: 3, value: blank?.qualityPercent ?? 100 }), "Множитель вместимости, 10–300"),
      label("Описание", input(RuneAdminFields.Description, { style: TextInputStyle.Paragraph, max: 500, value: blank?.description })),
    );
  }

  public static settings(settings: RuneSettings) {
    return modal(RuneAdminAction.SettingsModal, "Настройки рун").addLabelComponents(
      label("Нагрузка руны старшего футарка", input(RuneAdminFields.ElderLoad, { required: true, max: 2, value: settings.elderLoad })),
      label("Нагрузка руны младшего футарка", input(RuneAdminFields.YoungerLoad, { required: true, max: 2, value: settings.youngerLoad })),
      label("Снижение риска от владения, %", input(RuneAdminFields.Reduction, { required: true, max: 3, value: settings.masteryReductionPct }), "40 — при владении 100 риск ниже на 40"),
      label("Границы риска", input(RuneAdminFields.RiskBounds, { required: true, max: 7, value: `${settings.minRisk}-${settings.maxRisk}` }), "Минимум и максимум через дефис"),
      label(
        "Начальное владение / базовый риск",
        input(RuneAdminFields.Defaults, { required: true, max: 7, value: `${settings.defaultInitialMastery}/${settings.defaultBaseRisk}` }),
        "Значения по умолчанию через косую черту",
      ),
    );
  }
}
