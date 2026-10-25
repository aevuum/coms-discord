import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LessonRules } from "../../src/modules/schedule/lib/lessonRules.js";
import { ScheduleCustomIds, GradesAction, LessonCardAction, ScheduleAction } from "../../src/modules/schedule/lib/scheduleCustomIds.js";
import { ScheduleError } from "../../src/modules/schedule/types/schedule.js";

const now = new Date("2026-10-25T12:00:00Z");

describe("LessonRules", () => {
  it("normalises the topic", () => {
    assert.equal(LessonRules.topic("  Невербальные   чары "), "Невербальные чары");
    assert.throws(() => LessonRules.topic(" "), ScheduleError);
  });

  it("requires the lesson to start in the future window", () => {
    assert.equal(LessonRules.startsAt("25.10.2026 19:00", now).toISOString(), "2026-10-25T16:00:00.000Z");
    assert.throws(() => LessonRules.startsAt("25.10.2026 15:02", now), ScheduleError);
    assert.throws(() => LessonRules.startsAt("25.10.2027 19:00", now), ScheduleError);
    assert.throws(() => LessonRules.startsAt("вечером", now), ScheduleError);
  });

  it("validates capacity against current enrollments", () => {
    assert.equal(LessonRules.capacity(""), null);
    assert.equal(LessonRules.capacity("12", 5), 12);
    assert.throws(() => LessonRules.capacity("3", 5), ScheduleError);
    assert.throws(() => LessonRules.capacity("0"), ScheduleError);
  });

  it("knows when a reminder is due", () => {
    const startsAt = new Date(now.getTime() + 10 * 60_000);

    assert.equal(LessonRules.reminderDue(startsAt, 15, now), true);
    assert.equal(LessonRules.reminderDue(startsAt, 5, now), false);
    assert.equal(LessonRules.reminderDue(new Date(now.getTime() - 60_000), 15, now), false);
  });
});

describe("ScheduleCustomIds", () => {
  const cuid = "c".repeat(25);
  const snowflake = "1".repeat(20);

  it("round-trips and stays within the Discord limit", () => {
    const ids = [
      ScheduleCustomIds.teacher(ScheduleAction.GradeModal, cuid, cuid),
      ScheduleCustomIds.card(LessonCardAction.Join, cuid),
      ScheduleCustomIds.grades(GradesAction.Month, snowflake, cuid, cuid, "2026-10"),
    ];

    for (const id of ids) {
      assert.ok(id.length <= 100, id);
    }

    assert.deepEqual(ScheduleCustomIds.parseGrades(ids[2]), { action: GradesAction.Month, args: [snowflake, cuid, cuid, "2026-10"] });
    assert.equal(ScheduleCustomIds.parseTeacher(ids[1]), null);
  });
});
