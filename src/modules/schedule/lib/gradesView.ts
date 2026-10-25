import { AttachmentBuilder, type BaseInteraction } from "discord.js";

import { CharacterFaculty } from "../../../database/generated/prisma/client.js";

import { ScheduleRepository } from "../repositories/scheduleRepository.js";
import { GradeService } from "../service/gradeService.js";
import { ScheduleError } from "../types/schedule.js";
import { GRADES_FILE, GradeCard } from "./gradeCard.js";
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

    const characters = (await GradeService.characters(ownerId)).filter((character) => character.faculty !== CharacterFaculty.ADULT);

    if (!characters.length) {
      throw new ScheduleError(ownerId === interaction.user.id ? "У вас нет персонажей-учеников — табель ведётся только для студентов факультетов." : "У этого игрока нет персонажей-учеников.");
    }

    const selected = characters.find((entry) => entry.id === characterId) ?? (characters.length === 1 ? characters[0] : null);

    if (!selected) {
      return { components: [GradesContainer.picker(ownerId, characters)], files: [] };
    }

    const [report, subjects] = await Promise.all([
      GradeService.reportCard(selected.id, month, subject === "all" ? null : subject),
      ScheduleRepository.subjects(true),
    ]);

    const image = await GradeCard.student(
      report,
      selected.faculty,
      report.subjectId ? (subjects.find((entry) => entry.id === report.subjectId)?.name ?? null) : null,
    );

    return {
      components: [GradesContainer.view(report, characters, subjects)],
      files: [new AttachmentBuilder(image, { name: GRADES_FILE })],
    };
  }
}
