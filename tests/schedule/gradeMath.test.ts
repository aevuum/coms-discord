import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { GradeMath } from "../../src/modules/schedule/lib/gradeMath.js";

describe("GradeMath", () => {
  it("averages and formats like the report card", () => {
    assert.equal(GradeMath.formatAverage(GradeMath.average([5, 4, 5])), "4,67");
    assert.equal(GradeMath.formatAverage(GradeMath.average([4, 5])), "4,5");
    assert.equal(GradeMath.formatAverage(GradeMath.average([5])), "5");
    assert.equal(GradeMath.formatAverage(GradeMath.average([])), "—");
  });

  it("accepts only grades from 1 to 5", () => {
    assert.equal(GradeMath.parseValue("5"), 5);
    assert.equal(GradeMath.parseValue("0"), null);
    assert.equal(GradeMath.parseValue("4.5"), null);
    assert.equal(GradeMath.parseValue("six"), null);
  });

  it("validates work types", () => {
    assert.equal(GradeMath.parseWorkType("PRACTICE"), "PRACTICE");
    assert.equal(GradeMath.parseWorkType("homework"), null);
  });

  it("counts attendance only for lessons that already started", () => {
    const now = new Date("2026-10-25T12:00:00Z");
    const past = new Date("2026-10-20T12:00:00Z");
    const future = new Date("2026-10-30T12:00:00Z");

    assert.deepEqual(
      GradeMath.attendance(
        [
          { absent: false, startsAt: past },
          { absent: true, startsAt: past },
          { absent: false, startsAt: future },
        ],
        now,
      ),
      { present: 1, total: 2 },
    );
  });
});
