import {
  ActionRowBuilder,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";

import type { Character, GradeWorkType, Subject } from "../../../database/generated/prisma/client.js";

import { CharacterFormatter } from "../../economy/lib/characterFormatter.js";
import { WHITE_DIGITS } from "../../spells/lib/mana.js";
import type { ReportCard, SubjectReport } from "../service/gradeService.js";
import { GradeMath, MAX_GRADE, WORK_TYPE_LABELS } from "./gradeMath.js";
import { ARROW, PAD, subjectTitle, text } from "./lessonCard.js";
import { MoscowTime } from "./moscowTime.js";
import { GradesAction, ScheduleCustomIds } from "./scheduleCustomIds.js";

export const GRADES_HEADER = "<:teal_feather:1562262848598577284>";
const ALL = "all";
const MONTHS_BACK = 12;

const grade = (value: number) => WHITE_DIGITS[value] ?? `**${value}**`;

const SUMMARY_GRADES = 4;

const gradeLines = (report: SubjectReport, limit = report.grades.length) =>
  report.grades.length
    ? [
        ...report.grades
          .slice(-limit)
          .map((entry) => `${ARROW} **${entry.title}** · ${WORK_TYPE_LABELS[entry.workType as GradeWorkType]} · ${grade(entry.value)}`),
        ...(report.grades.length > limit ? [`-# и ещё ${report.grades.length - limit} — выберите предмет, чтобы увидеть все`] : []),
      ]
    : ["-# Оценок за этот месяц нет."];

const summary = (average: number | null, attendance: { present: number; total: number }) =>
  `**Средний балл:** ${average === null ? "—" : `**${GradeMath.formatAverage(average)}** / ${MAX_GRADE}`} · **Посещаемость:** ${attendance.total ? `${attendance.present} из ${attendance.total}` : "—"}`;

export class GradesContainer {
  public static picker(ownerId: string, characters: Character[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);

    text(container, [`# ${GRADES_HEADER} Табель успеваемости`, "", `${ARROW} Выберите персонажа.`, `-# ${PAD}`]);

    container.addActionRowComponents(this.characterSelect(ownerId, characters, null, ALL, MoscowTime.monthKey(new Date())));

    return container;
  }

  public static view(report: ReportCard, characters: Character[], subjects: Subject[]) {
    const container = new ContainerBuilder().setAccentColor(0x475b56);
    const single = report.subjectId ? report.subjects[0] ?? null : null;
    const selectedSubject = report.subjectId ? subjects.find((entry) => entry.id === report.subjectId) ?? null : null;

    text(container, [
      `# ${GRADES_HEADER} Табель успеваемости`,
      `-# ${report.character.rpName} · ${selectedSubject ? subjectTitle(selectedSubject) : "Все предметы"} · ${MoscowTime.monthLabel(report.month)}`,
    ]);

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    if (report.subjectId) {
      text(container, single ? gradeLines(single) : ["-# За этот месяц по предмету нет ни оценок, ни занятий."]);
    } else if (report.subjects.length) {
      text(
        container,
        report.subjects.flatMap((entry) => [
          `### ${subjectTitle(entry.subject)}`,
          ...gradeLines(entry, SUMMARY_GRADES),
          `-# Средний балл ${GradeMath.formatAverage(entry.average)} · посещаемость ${entry.attendance.total ? `${entry.attendance.present} из ${entry.attendance.total}` : "—"}`,
        ]),
      );
    } else {
      text(container, ["-# За этот месяц нет ни оценок, ни посещённых занятий."]);
    }

    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

    text(container, [
      single ? summary(single.average, single.attendance) : summary(report.average, report.attendance),
      `-# ${PAD}`,
    ]);

    const subjectKey = report.subjectId ?? ALL;
    const { ownerId, id } = report.character;

    if (characters.length > 1) {
      container.addActionRowComponents(this.characterSelect(ownerId, characters, id, subjectKey, report.month));
    }

    container.addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(ScheduleCustomIds.grades(GradesAction.Subject, ownerId, id, subjectKey, report.month))
          .addOptions(
            new StringSelectMenuOptionBuilder().setLabel("Все предметы").setValue(ALL).setDefault(subjectKey === ALL),
            ...subjects.slice(0, 24).map((subject) => {
              const option = new StringSelectMenuOptionBuilder()
                .setLabel(subject.name.slice(0, 100))
                .setValue(subject.id)
                .setDefault(subject.id === subjectKey);

              return subject.emoji ? option.setEmoji(subject.emoji) : option;
            }),
          ),
      ),
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(ScheduleCustomIds.grades(GradesAction.Month, ownerId, id, subjectKey, report.month))
          .addOptions(
            MoscowTime.recentMonths(MONTHS_BACK).map((month) =>
              new StringSelectMenuOptionBuilder().setLabel(MoscowTime.monthLabel(month)).setValue(month).setDefault(month === report.month),
            ),
          ),
      ),
    );

    return container;
  }

  private static characterSelect(ownerId: string, characters: Character[], current: string | null, subject: string, month: string) {
    return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(ScheduleCustomIds.grades(GradesAction.Character, ownerId, current ?? "none", subject, month))
        .setPlaceholder("Выберите персонажа")
        .addOptions(
          characters.slice(0, 25).map((character) =>
            new StringSelectMenuOptionBuilder()
              .setLabel(character.rpName.slice(0, 100))
              .setDescription(CharacterFormatter.facultyLabel(character.faculty))
              .setEmoji(CharacterFormatter.facultyEmoji(character.faculty))
              .setValue(character.id)
              .setDefault(character.id === current),
          ),
        ),
    );
  }
}
