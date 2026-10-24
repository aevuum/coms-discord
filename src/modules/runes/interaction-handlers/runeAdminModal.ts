import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import type { ContainerBuilder, ModalSubmitInteraction } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { RuneAdminAction, RuneAdminCustomIds, RuneAdminFields, RuneAdminSection } from "../lib/runeAdminCustomIds.js";
import { RuneAdminViews } from "../lib/runeAdminViews.js";
import { ArtifactService } from "../service/artifactService.js";
import { FormulaService } from "../service/formulaService.js";
import { RuneAudit } from "../service/runeAudit.js";
import { RuneDefinitionService } from "../service/runeDefinitionService.js";
import { RuneError, RuneRegistry } from "../service/runeRegistry.js";
import { RuneService } from "../service/runeService.js";

const MODAL_ACTIONS = new Set<RuneAdminAction>([
  RuneAdminAction.RequestApproveModal,
  RuneAdminAction.RequestRejectModal,
  RuneAdminAction.FormulaCreateModal,
  RuneAdminAction.FormulaEditModal,
  RuneAdminAction.FormulaApproveModal,
  RuneAdminAction.FormulaRejectModal,
  RuneAdminAction.RecipeSaveModal,
  RuneAdminAction.RecipeApproveModal,
  RuneAdminAction.RecipeRejectModal,
  RuneAdminAction.RuneTextModal,
  RuneAdminAction.RuneMetaModal,
  RuneAdminAction.MaterialSaveModal,
  RuneAdminAction.BlankSaveModal,
  RuneAdminAction.SettingsModal,
]);

export class RuneAdminModalHandler extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.ModalSubmit,
    });
  }

  public override parse(interaction: ModalSubmitInteraction) {
    const parsed = RuneAdminCustomIds.parse(interaction.customId);

    if (!parsed || !MODAL_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(interaction: ModalSubmitInteraction, result: { action: RuneAdminAction; args: string[] }) {
    try {
      await ManageResponder.defer(interaction);
      await RuneAudit.assertCurator(interaction);

      await ManageResponder.send(interaction, await this.resolve(interaction, result.action, result.args[0]));
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }

  private async resolve(interaction: ModalSubmitInteraction, action: RuneAdminAction, id: string): Promise<ContainerBuilder> {
    const actorId = interaction.user.id;
    const field = (name: string) => {
      try {
        return interaction.fields.getTextInputValue(name);
      } catch {
        return "";
      }
    };
    const choice = (name: string) => interaction.fields.getStringSelectValues(name)[0] ?? "";
    const existing = id && id !== "new" ? id : null;

    switch (action) {
      case RuneAdminAction.RequestApproveModal: {
        const { request, mastery } = await RuneService.approveRequest(id, actorId, field(RuneAdminFields.Mastery));
        return RuneAdminViews.section(RuneAdminSection.Requests, `Руна ${request.rune.emoji} ${request.rune.name} открыта персонажу, владение ${mastery}.`);
      }

      case RuneAdminAction.RequestRejectModal: {
        const request = await RuneService.rejectRequest(id, actorId, field(RuneAdminFields.Reason));
        return RuneAdminViews.section(RuneAdminSection.Requests, `Заявка на руну ${request.rune.name} отклонена.`);
      }

      case RuneAdminAction.FormulaCreateModal: {
        const rune = await RuneRegistry.find(field(RuneAdminFields.Rune));

        if (!rune) {
          throw new RuneError(`Руна «${field(RuneAdminFields.Rune)}» не найдена.`);
        }

        const formula = await FormulaService.create(actorId, {
          spellQuery: field(RuneAdminFields.Spell),
          runeKey: rune.key,
          incantation: field(RuneAdminFields.Incantation),
          effect: field(RuneAdminFields.Effect),
          mechanics: field(RuneAdminFields.Mechanics),
        });

        return RuneAdminViews.formula(formula.id, "Формула создана. Проверьте параметры и утвердите её.");
      }

      case RuneAdminAction.FormulaEditModal: {
        const formula = await FormulaService.update(id, actorId, {
          incantation: field(RuneAdminFields.Incantation),
          effect: field(RuneAdminFields.Effect),
          mechanics: field(RuneAdminFields.Mechanics),
          restrictions: field(RuneAdminFields.Restrictions),
        });

        return RuneAdminViews.formula(formula.id, "Текст формулы обновлён.");
      }

      case RuneAdminAction.FormulaApproveModal: {
        const formula = await FormulaService.approve(id, actorId, {
          minMastery: field(RuneAdminFields.MinMastery),
          baseRisk: field(RuneAdminFields.BaseRisk),
          complexity: field(RuneAdminFields.Complexity),
          failureOutcome: choice(RuneAdminFields.FailureOutcome),
        });

        return RuneAdminViews.formula(formula.id, "Формула утверждена и доступна игрокам с этой руной.");
      }

      case RuneAdminAction.FormulaRejectModal: {
        const formula = await FormulaService.reject(id, actorId, field(RuneAdminFields.Reason));
        return RuneAdminViews.formula(formula.id, "Формула отклонена.");
      }

      case RuneAdminAction.RecipeSaveModal: {
        const recipe = await ArtifactService.saveRecipe(
          existing,
          {
            name: field(RuneAdminFields.Name),
            effect: field(RuneAdminFields.Effect),
            blank: choice(RuneAdminFields.Blank),
            runes: field(RuneAdminFields.Runes),
            materials: field(RuneAdminFields.Materials),
          },
          actorId,
        );

        return RuneAdminViews.recipe(recipe.id, existing ? "Рецепт изменён и снова ждёт утверждения." : "Рецепт создан. Проверьте нагрузку и утвердите его.");
      }

      case RuneAdminAction.RecipeApproveModal: {
        const recipe = await ArtifactService.approveRecipe(id, actorId, {
          minMastery: field(RuneAdminFields.MinMastery),
          baseRisk: field(RuneAdminFields.BaseRisk),
          complexity: field(RuneAdminFields.Complexity),
          overloadOutcome: choice(RuneAdminFields.OverloadOutcome),
          failureOutcome: choice(RuneAdminFields.FailureOutcome),
        });

        return RuneAdminViews.recipe(recipe.id, "Рецепт утверждён.");
      }

      case RuneAdminAction.RecipeRejectModal: {
        const recipe = await ArtifactService.rejectRecipe(id, actorId, field(RuneAdminFields.Reason));
        return RuneAdminViews.recipe(recipe.id, "Рецепт отклонён.");
      }

      case RuneAdminAction.RuneTextModal: {
        const rune = await RuneDefinitionService.updateText(
          id,
          {
            domain: field(RuneAdminFields.Domain),
            principle: field(RuneAdminFields.Principle),
            modifies: field(RuneAdminFields.Modifies),
            spellUse: field(RuneAdminFields.SpellUse),
            artifactUse: field(RuneAdminFields.ArtifactUse),
          },
          actorId,
        );

        return RuneAdminViews.rune(rune.key, "Описание руны сохранено.");
      }

      case RuneAdminAction.RuneMetaModal: {
        const rune = await RuneDefinitionService.updateMeta(
          id,
          {
            meaning: field(RuneAdminFields.Meaning),
            load: field(RuneAdminFields.Load),
            restrictions: field(RuneAdminFields.Restrictions),
          },
          actorId,
        );

        return RuneAdminViews.rune(rune.key, "Значение и нагрузка сохранены.");
      }

      case RuneAdminAction.MaterialSaveModal: {
        const material = await ArtifactService.saveMaterial(
          existing,
          {
            name: field(RuneAdminFields.Name),
            capacityBonus: field(RuneAdminFields.CapacityBonus),
            description: field(RuneAdminFields.Description),
          },
          actorId,
        );

        return RuneAdminViews.section(RuneAdminSection.Materials, `Материал «${material.name}» сохранён.`);
      }

      case RuneAdminAction.BlankSaveModal: {
        const blank = await ArtifactService.saveBlank(
          existing,
          {
            name: field(RuneAdminFields.Name),
            kind: field(RuneAdminFields.Kind),
            baseCapacity: field(RuneAdminFields.BaseCapacity),
            qualityPercent: field(RuneAdminFields.Quality),
            description: field(RuneAdminFields.Description),
          },
          actorId,
        );

        return RuneAdminViews.section(RuneAdminSection.Blanks, `Заготовка «${blank.name}» сохранена.`);
      }

      default: {
        await RuneDefinitionService.updateSettings(
          {
            elderLoad: field(RuneAdminFields.ElderLoad),
            youngerLoad: field(RuneAdminFields.YoungerLoad),
            masteryReductionPct: field(RuneAdminFields.Reduction),
            riskBounds: field(RuneAdminFields.RiskBounds),
            defaults: field(RuneAdminFields.Defaults),
          },
          actorId,
        );

        return RuneAdminViews.section(RuneAdminSection.Settings, "Настройки сохранены.");
      }
    }
  }
}
