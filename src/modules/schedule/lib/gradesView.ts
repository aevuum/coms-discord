import type { BaseInteraction } from "discord.js";

import { ScheduleRepository } from "../repositories/scheduleRepository.js";
import { GradeService } from "../service/gradeService.js";
import { ScheduleError } from "../types/schedule.js";
import { GradesContainer } from "./gradesContainer.js";
import { MoscowTime } from "./moscowTime.js";

export class GradesView {
  public static async open(
    interaction: BaseInteraction,
    ownerId: string,
    characterId: string | null,
    subject = "all",
    month = MoscowTime.monthKey(new Date()),
  ) {
    await GradeService.assertCanView(interaction, ownerId);

    const characters = await GradeService.characters(ownerId);

    if (!characters.length) {
      throw new ScheduleError(ownerId === interaction.user.id ? "У вас пока нет персонажей." : "У этого игрока нет персонажей.");
    }

    const selected = characters.find((entry) => entry.id === characterId) ?? (characters.length === 1 ? characters[0] : null);

    if (!selected) {
      return GradesContainer.picker(ownerId, characters);
    }

    const [report, subjects] = await Promise.all([
      GradeService.reportCard(selected.id, month, subject === "all" ? null : subject),
      ScheduleRepository.subjects(true),
    ]);

    return GradesContainer.view(report, characters, subjects);
  }
}
