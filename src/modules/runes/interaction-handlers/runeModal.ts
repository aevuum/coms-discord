import {
  InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";

import { MessageFlags, ModalSubmitInteraction } from "discord.js";

import { RuneAction, RuneCustomIds, RuneModalFields, RuneTab } from "../lib/runeCustomIds.js";
import { RuneResponder } from "../lib/runeResponder.js";
import { RuneView } from "../lib/runeView.js";
import { FormulaService } from "../service/formulaService.js";
import { RuneService } from "../service/runeService.js";

const MODAL_ACTIONS = new Set<RuneAction>([
  RuneAction.StudyModal,
  RuneAction.ProposeModal,
  RuneAction.AttemptModal,
]);

export class RuneModalHandler extends InteractionHandler {
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
    const parsed = RuneCustomIds.parse(interaction.customId);

    if (!parsed || !MODAL_ACTIONS.has(parsed.action)) {
      return this.none();
    }

    return this.some(parsed);
  }

  public override async run(interaction: ModalSubmitInteraction, result: { action: RuneAction; args: string[] }) {
    const userId = interaction.user.id;
    const [characterId] = result.args;
    const field = (id: string) => interaction.fields.getTextInputValue(id);

    try {
      if (interaction.isFromMessage()) {
        await interaction.deferUpdate();
      } else {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }

      let notice: string;

      if (result.action === RuneAction.StudyModal) {
        const { rune } = await RuneService.requestStudy(
          userId,
          characterId,
          result.args[1],
          field(RuneModalFields.PostUrl),
          field(RuneModalFields.Note),
        );

        notice = `Заявка на изучение руны ${rune.emoji} ${rune.name} отправлена кураторам.`;
      } else if (result.action === RuneAction.AttemptModal) {
        const { formula } = await FormulaService.submitAttempt(
          userId,
          characterId,
          result.args[1],
          field(RuneModalFields.PostUrl),
          field(RuneModalFields.Note),
        );

        notice = `Попытка «${formula.incantation}» отправлена куратору. Итог появится здесь.`;
      } else {
        const formula = await FormulaService.propose(userId, characterId, {
          spellQuery: field(RuneModalFields.Spell),
          runeKey: interaction.fields.getStringSelectValues(RuneModalFields.Rune)[0] ?? "",
          incantation: field(RuneModalFields.Incantation),
          effect: field(RuneModalFields.Effect),
          mechanics: field(RuneModalFields.Mechanics),
        });

        notice = `Формула «${formula.incantation}» отправлена кураторам на проверку.`;
      }

      await interaction.editReply({
        flags: MessageFlags.IsComponentsV2,
        components: [await RuneView.character(userId, characterId, RuneTab.Requests, 0, notice)],
      });
    } catch (error) {
      await RuneResponder.error(interaction, error);
    }
  }
}
