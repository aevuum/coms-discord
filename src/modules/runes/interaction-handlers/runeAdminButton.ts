import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { ButtonInteraction, MessageFlags, type ContainerBuilder, type ModalBuilder } from "discord.js";

import { ManageResponder } from "../../manage/lib/manageResponder.js";
import { RuneAdminAction, RuneAdminCustomIds, RuneAdminSection } from "../lib/runeAdminCustomIds.js";
import { RuneAdminModals } from "../lib/runeAdminModals.js";
import { RuneAdminViews } from "../lib/runeAdminViews.js";
import { ArtifactService } from "../service/artifactService.js";
import { FormulaService } from "../service/formulaService.js";
import { RuneAudit } from "../service/runeAudit.js";
import { RuneError, RuneRegistry } from "../service/runeRegistry.js";

const MODAL_ACTIONS = new Set<RuneAdminAction>([
  RuneAdminAction.RequestApprove,
  RuneAdminAction.RequestReject,
  RuneAdminAction.FormulaCreate,
  RuneAdminAction.FormulaEdit,
  RuneAdminAction.FormulaApprove,
  RuneAdminAction.FormulaReject,
  RuneAdminAction.RecipeCreate,
  RuneAdminAction.RecipeEdit,
  RuneAdminAction.RecipeApprove,
  RuneAdminAction.RecipeReject,
  RuneAdminAction.RuneText,
  RuneAdminAction.RuneMeta,
  RuneAdminAction.MaterialCreate,
  RuneAdminAction.MaterialEdit,
  RuneAdminAction.BlankCreate,
  RuneAdminAction.BlankEdit,
  RuneAdminAction.SettingsEdit,
]);

const UPDATE_ACTIONS = new Set<RuneAdminAction>([
  RuneAdminAction.Root,
  RuneAdminAction.FormulaToggle,
  RuneAdminAction.RecipeToggle,
  RuneAdminAction.MaterialDelete,
  RuneAdminAction.BlankDelete,
]);

export class RuneAdminButtonHandler extends InteractionHandler {
  public constructor(
    ctx: InteractionHandler.LoaderContext,
    options: InteractionHandler.Options,
  ) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button,
    });
  }

  public override parse(interaction: ButtonInteraction) {
    const parsed = RuneAdminCustomIds.parse(interaction.customId);

    if (!parsed || (!MODAL_ACTIONS.has(parsed.action) && !UPDATE_ACTIONS.has(parsed.action))) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(interaction: ButtonInteraction, result: { action: RuneAdminAction; args: string[] }) {
    try {
      if (MODAL_ACTIONS.has(result.action)) {
        await interaction.showModal(await this.modal(result.action, result.args[0]));
        return;
      }

      await RuneAudit.assertCurator(interaction);

      await interaction.update({
        flags: MessageFlags.IsComponentsV2,
        components: [await this.view(result.action, result.args[0], interaction.user.id)],
      });
    } catch (error) {
      await ManageResponder.error(interaction, error);
    }
  }

  private async modal(action: RuneAdminAction, id: string): Promise<ModalBuilder> {
    switch (action) {
      case RuneAdminAction.RequestApprove:
        return RuneAdminModals.approveRequest(id, await RuneRegistry.getSettings());
      case RuneAdminAction.RequestReject:
        return RuneAdminModals.reason(RuneAdminAction.RequestRejectModal, id, "Отказ в изучении руны");
      case RuneAdminAction.FormulaCreate:
        return RuneAdminModals.formulaCreate();
      case RuneAdminAction.FormulaEdit:
        return RuneAdminModals.formulaEdit(await FormulaService.get(id));
      case RuneAdminAction.FormulaApprove:
        return RuneAdminModals.formulaApprove(await FormulaService.get(id));
      case RuneAdminAction.FormulaReject:
        return RuneAdminModals.reason(RuneAdminAction.FormulaRejectModal, id, "Отказ в формуле");
      case RuneAdminAction.RecipeCreate:
      case RuneAdminAction.RecipeEdit: {
        const blanks = await ArtifactService.listBlanks();

        if (!blanks.length) {
          throw new RuneError("Сначала добавьте хотя бы одну заготовку в разделе «Заготовки».");
        }

        return RuneAdminModals.recipe(blanks, action === RuneAdminAction.RecipeEdit ? await ArtifactService.getRecipe(id) : null);
      }
      case RuneAdminAction.RecipeApprove:
        return RuneAdminModals.recipeApprove(await ArtifactService.getRecipe(id));
      case RuneAdminAction.RecipeReject:
        return RuneAdminModals.reason(RuneAdminAction.RecipeRejectModal, id, "Отказ в рецепте");
      case RuneAdminAction.RuneText:
        return RuneAdminModals.runeText(await RuneRegistry.get(id));
      case RuneAdminAction.RuneMeta:
        return RuneAdminModals.runeMeta(await RuneRegistry.get(id));
      case RuneAdminAction.MaterialCreate:
        return RuneAdminModals.material(null);
      case RuneAdminAction.MaterialEdit:
        return RuneAdminModals.material(await ArtifactService.getMaterial(id));
      case RuneAdminAction.BlankCreate:
        return RuneAdminModals.blank(null);
      case RuneAdminAction.BlankEdit:
        return RuneAdminModals.blank(await ArtifactService.getBlank(id));
      default:
        return RuneAdminModals.settings(await RuneRegistry.getSettings());
    }
  }

  private async view(action: RuneAdminAction, id: string | undefined, actorId: string): Promise<ContainerBuilder> {
    switch (action) {
      case RuneAdminAction.FormulaToggle: {
        const formula = await FormulaService.toggle(id!, actorId);
        return RuneAdminViews.formula(formula.id, "Статус формулы изменён.");
      }
      case RuneAdminAction.RecipeToggle: {
        const recipe = await ArtifactService.toggleRecipe(id!, actorId);
        return RuneAdminViews.recipe(recipe.id, "Статус рецепта изменён.");
      }
      case RuneAdminAction.MaterialDelete: {
        const material = await ArtifactService.deleteMaterial(id!, actorId);
        return RuneAdminViews.section(RuneAdminSection.Materials, `Материал «${material.name}» удалён.`);
      }
      case RuneAdminAction.BlankDelete: {
        const blank = await ArtifactService.deleteBlank(id!, actorId);
        return RuneAdminViews.section(RuneAdminSection.Blanks, `Заготовка «${blank.name}» удалена.`);
      }
      default:
        return id ? RuneAdminViews.section(id as RuneAdminSection) : RuneAdminViews.root();
    }
  }
}
