import type { CharacterFaculty, GradeWorkType } from "../../../database/generated/prisma/client.js";

import type { ReportCard } from "../service/gradeService.js";
import type { BoardStudent } from "./gradeBoardContainer.js";
import { GradeMath, MAX_GRADE, WORK_TYPE_LABELS } from "./gradeMath.js";
import { MoscowTime } from "./moscowTime.js";
import {
  CAPS,
  CRIMSON,
  HAND,
  HOUSE_NAMES,
  INK,
  Parchment,
  PENCIL,
  PENCIL_DARK,
  RULE_SOFT,
  SCRIPT,
} from "./parchment.js";

export const GRADES_FILE = "grades.jpg";

const GRADE_INKS: Record<number, string> = {
  5: "#1d5a3a",
  4: "#1f3a6e",
  3: "#6b3a1d",
  2: CRIMSON,
  1: CRIMSON,
};

const STUDENT_W = 1400;
const BOARD_W = 1660;
const ROW = 60;
const BAND = 56;
const MAX_ROWS = 22;

type Line = { kind: "band"; title: string; note: string } | { kind: "grade"; title: string; type: string; value: number } | { kind: "more"; count: number };

const attendanceText = (attendance: { present: number; total: number }) =>
  attendance.total ? `${attendance.present} из ${attendance.total}` : "—";

export class GradeCard {
  public static async student(report: ReportCard, faculty: CharacterFaculty, subjectName: string | null) {
    const lines = this.lines(report);
    const tableTop = 200;
    const tableHeader = 64;
    const body = lines.reduce((sum, line) => sum + (line.kind === "band" ? BAND : ROW), 0) || 160;
    const height = Math.max(700, tableTop + tableHeader + body + 250);

    const sheet = Parchment.create(STUDENT_W, height, `${report.character.id}:${report.month}:${report.subjectId ?? "all"}`, -0.014);

    await sheet.header({
      title: HOUSE_NAMES[faculty],
      crest: faculty,
      left: ["Табель успеваемости", MoscowTime.monthLabel(report.month)],
      right: [report.character.rpName, subjectName ?? "все предметы"],
    });

    const left = 56;
    const right = STUDENT_W - 56;
    const typeX = right - 420;
    const gradeX = right - 150;
    const bottom = tableTop + tableHeader + body;

    sheet.rule(left, tableTop, right, tableTop, 2.2);
    sheet.rule(left, tableTop + 6, right, tableTop + 6, 1, RULE_SOFT);
    sheet.hand("Работа", left + 24, tableTop + 46, { font: `38px ${SCRIPT}`, color: INK, angle: -0.03 });
    sheet.hand("Тип", typeX + 24, tableTop + 46, { font: `38px ${SCRIPT}`, color: INK, angle: -0.03 });
    sheet.hand("Оценка", gradeX + 18, tableTop + 46, { font: `38px ${SCRIPT}`, color: INK, angle: -0.03 });
    sheet.rule(left, tableTop + tableHeader, right, tableTop + tableHeader, 2);

    let y = tableTop + tableHeader;

    if (!lines.length) {
      sheet.hand("За этот месяц оценок пока нет", (left + right) / 2, y + 96, { font: `50px ${SCRIPT}`, color: PENCIL_DARK, angle: -0.03, align: "center" });
    }

    for (const line of lines) {
      if (line.kind === "band") {
        sheet.band(left + 2, y + 3, right - left - 4, BAND - 6);
        sheet.hand(line.title, left + 24, y + 40, { font: `36px ${SCRIPT}`, color: INK, angle: -0.02, maxWidth: typeX - left - 40 });
        sheet.hand(line.note, right - 24, y + 36, { font: `22px ${HAND}`, color: PENCIL_DARK, align: "right" });
        y += BAND;
        sheet.rule(left, y, right, y, 1.6);
        continue;
      }

      if (line.kind === "more") {
        sheet.hand(`и ещё ${line.count} — выберите предмет, чтобы увидеть все`, (left + right) / 2, y + 38, { font: `24px ${HAND}`, color: PENCIL_DARK, align: "center" });
        y += ROW;
        continue;
      }

      sheet.rule(typeX, y, typeX, y + ROW, 1.2, RULE_SOFT);
      sheet.rule(gradeX, y, gradeX, y + ROW, 1.2, RULE_SOFT);
      sheet.hand(line.title, left + 24, y + 40, { font: `32px ${SCRIPT}`, color: INK, angle: -0.03 + (sheet.rnd() - 0.5) * 0.03, maxWidth: typeX - left - 40 });
      sheet.hand(line.type, typeX + 24, y + 38, { font: `26px ${HAND}`, color: INK, angle: -0.02 });
      this.mark(sheet, gradeX + 60, y + ROW / 2, line.value);
      y += ROW;
      sheet.rule(left, y, right, y, 0.9, RULE_SOFT);
    }

    sheet.rule(left, tableTop, left, bottom, 2);
    sheet.rule(right, tableTop, right, bottom, 2);
    sheet.rule(typeX, tableTop, typeX, tableTop + tableHeader, 1.2, RULE_SOFT);
    sheet.rule(gradeX, tableTop, gradeX, tableTop + tableHeader, 1.2, RULE_SOFT);
    sheet.rule(left, bottom, right, bottom, 2.2);

    const summary = report.subjectId ? report.subjects[0] : null;
    const average = summary ? summary.average : report.average;
    const attendance = summary ? summary.attendance : report.attendance;
    const sy = bottom + 70;

    sheet.hand("Средний балл", left + 24, sy, { font: `30px ${HAND}`, color: PENCIL_DARK });
    sheet.hand(
      average === null ? "—" : `${GradeMath.formatAverage(average)} / ${MAX_GRADE}`,
      left + 20,
      sy + 76,
      { font: `72px ${SCRIPT}`, color: average === null ? PENCIL_DARK : average >= 4.5 ? "#1d5a3a" : average >= 3.5 ? "#1f3a6e" : CRIMSON, angle: -0.04 },
    );
    sheet.hand("Посещаемость", right - 24, sy, { font: `30px ${HAND}`, color: PENCIL_DARK, align: "right" });
    sheet.hand(attendanceText(attendance), right - 24, sy + 70, { font: `60px ${SCRIPT}`, color: INK, align: "right", angle: 0.03 });

    sheet.seal();

    return sheet.encode();
  }

  public static async board(students: BoardStudent[], month: string, page: number, pages: number, total: number) {
    const rowHeight = 96;
    const tableTop = 200;
    const tableHeader = 64;
    const rows = Math.max(students.length, 1);
    const height = tableTop + tableHeader + rows * rowHeight + 150;

    const sheet = Parchment.create(BOARD_W, height, `board:${month}:${page}`, -0.012);

    await sheet.header({
      title: "Успеваемость",
      crest: null,
      left: ["Ведомость школы", MoscowTime.monthLabel(month)],
      right: [`лист ${page + 1} из ${pages}`, `учеников: ${total}`],
    });

    const left = 46;
    const right = BOARD_W - 46;
    const cols = { name: left, average: left + 560, count: left + 800, attendance: left + 960, subjects: left + 1180 };
    const bottom = tableTop + tableHeader + rows * rowHeight;

    sheet.rule(left, tableTop, right, tableTop, 2.2);
    sheet.rule(left, tableTop + 6, right, tableTop + 6, 1, RULE_SOFT);
    sheet.hand("Ученик", cols.name + 90, tableTop + 46, { font: `36px ${SCRIPT}`, color: INK });
    sheet.hand("Средний балл", cols.average + 20, tableTop + 46, { font: `34px ${SCRIPT}`, color: INK });
    sheet.hand("Оценок", cols.count + 20, tableTop + 46, { font: `34px ${SCRIPT}`, color: INK });
    sheet.hand("Посещаемость", cols.attendance + 16, tableTop + 46, { font: `34px ${SCRIPT}`, color: INK });
    sheet.hand("По предметам", cols.subjects + 20, tableTop + 46, { font: `34px ${SCRIPT}`, color: INK });
    sheet.rule(left, tableTop + tableHeader, right, tableTop + tableHeader, 2);

    let y = tableTop + tableHeader;

    if (!students.length) {
      sheet.hand("Учеников пока нет", (left + right) / 2, y + 60, { font: `48px ${SCRIPT}`, color: PENCIL_DARK, align: "center" });
    }

    for (const student of students) {
      const crest = await Parchment.crest(student.faculty);

      if (crest) {
        sheet.ctx.save();
        sheet.ctx.globalCompositeOperation = "multiply";
        sheet.ctx.globalAlpha = 0.85;
        sheet.ctx.drawImage(crest, cols.name + 18, y + 22, 52, 52);
        sheet.ctx.restore();
      }

      sheet.hand(student.rpName, cols.name + 90, y + 58, { font: `38px ${SCRIPT}`, color: INK, angle: -0.03, maxWidth: cols.average - cols.name - 110 });

      if (student.average !== null) {
        const color = student.average >= 4.5 ? "#1d5a3a" : student.average >= 3.5 ? "#1f3a6e" : CRIMSON;
        sheet.hand(GradeMath.formatAverage(student.average), cols.average + 110, y + 62, { font: `50px ${SCRIPT}`, color, align: "center", angle: -0.04 });
      } else {
        sheet.hand("—", cols.average + 110, y + 60, { font: `40px ${HAND}`, color: PENCIL, align: "center" });
      }

      sheet.hand(String(student.grades || "—"), cols.count + 80, y + 60, { font: `36px ${CAPS}`, color: student.grades ? INK : PENCIL, align: "center" });
      sheet.hand(attendanceText(student.attendance), cols.attendance + 110, y + 60, { font: `38px ${SCRIPT}`, color: student.attendance.total ? INK : PENCIL, align: "center" });

      const subjects = student.subjects.slice(0, 4).map((entry) => `${entry.subject.name} ${GradeMath.formatAverage(entry.average)}`);
      subjects.forEach((text, index) => {
        sheet.hand(text, cols.subjects + 20 + (index % 2) * 200, y + 38 + Math.floor(index / 2) * 34, { font: `22px ${HAND}`, color: PENCIL_DARK, maxWidth: 190 });
      });

      if (!subjects.length) {
        sheet.hand("оценок нет", cols.subjects + 20, y + 56, { font: `22px ${HAND}`, color: PENCIL });
      }

      y += rowHeight;
      sheet.rule(left, y, right, y, 1, RULE_SOFT);
    }

    for (const x of [cols.average, cols.count, cols.attendance, cols.subjects]) {
      sheet.rule(x, tableTop, x, bottom, 1.2, RULE_SOFT);
    }

    sheet.rule(left, tableTop, left, bottom, 2);
    sheet.rule(right, tableTop, right, bottom, 2);
    sheet.rule(left, bottom, right, bottom, 2.2);

    sheet.hand("Подробный табель своего персонажа — команда /grades", 60, height - 30, { font: `22px ${HAND}`, color: PENCIL_DARK });
    sheet.seal();

    return sheet.encode();
  }

  private static lines(report: ReportCard): Line[] {
    const lines: Line[] = [];
    let used = 0;

    for (const subject of report.subjects) {
      if (!report.subjectId) {
        lines.push({
          kind: "band",
          title: subject.subject.name,
          note: `средний ${GradeMath.formatAverage(subject.average)} · посещаемость ${attendanceText(subject.attendance)}`,
        });
      }

      for (const grade of subject.grades) {
        if (used >= MAX_ROWS) {
          continue;
        }

        lines.push({ kind: "grade", title: grade.title, type: WORK_TYPE_LABELS[grade.workType as GradeWorkType], value: grade.value });
        used++;
      }
    }

    const all = report.subjects.reduce((sum, subject) => sum + subject.grades.length, 0);

    if (all > used) {
      lines.push({ kind: "more", count: all - used });
    }

    return lines;
  }

  private static mark(sheet: Parchment, cx: number, cy: number, value: number) {
    const { ctx, rnd } = sheet;
    const color = GRADE_INKS[value] ?? INK;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.7;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx + (rnd() - 0.5) * 3, cy, 26 + rnd() * 3, 22 + rnd() * 3, -0.2, 0.3, Math.PI * 2 + 0.1);
    ctx.stroke();
    ctx.restore();

    sheet.hand(String(value), cx, cy + 14, { font: `44px ${SCRIPT}`, color, align: "center", angle: -0.05 });
  }
}
