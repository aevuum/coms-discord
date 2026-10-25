import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MoscowTime } from "../../src/modules/schedule/lib/moscowTime.js";

const now = new Date("2026-10-25T12:00:00Z");

describe("MoscowTime.parse", () => {
  it("reads a full date as Moscow time", () => {
    assert.equal(MoscowTime.parse("25.10.2026 19:00", now)?.toISOString(), "2026-10-25T16:00:00.000Z");
  });

  it("accepts a two-digit year and other separators", () => {
    assert.equal(MoscowTime.parse("01/11/26 9.30", now)?.toISOString(), "2026-11-01T06:30:00.000Z");
  });

  it("uses the current year when it is still ahead", () => {
    assert.equal(MoscowTime.parse("31.12 23:59", now)?.toISOString(), "2026-12-31T20:59:00.000Z");
  });

  it("rolls a past date without a year to next year", () => {
    assert.equal(MoscowTime.parse("01.01 10:00", now)?.toISOString(), "2027-01-01T07:00:00.000Z");
  });

  it("rejects impossible dates and times", () => {
    assert.equal(MoscowTime.parse("31.02.2027 10:00", now), null);
    assert.equal(MoscowTime.parse("10.10.2027 24:00", now), null);
    assert.equal(MoscowTime.parse("завтра в семь", now), null);
  });
});

describe("MoscowTime formatting", () => {
  it("formats in Moscow time", () => {
    assert.equal(MoscowTime.format(new Date("2026-10-25T21:30:00Z")), "26.10.2026 00:30");
  });

  it("buckets months by Moscow time", () => {
    assert.equal(MoscowTime.monthKey(new Date("2026-10-31T21:30:00Z")), "2026-11");

    const range = MoscowTime.monthRange("2026-11");

    assert.equal(range.from.toISOString(), "2026-10-31T21:00:00.000Z");
    assert.equal(range.to.toISOString(), "2026-11-30T21:00:00.000Z");
    assert.equal(MoscowTime.monthLabel("2026-11"), "Ноябрь 2026");
  });

  it("lists recent months across a year boundary", () => {
    assert.deepEqual(MoscowTime.recentMonths(3, new Date("2027-02-10T00:00:00Z")), ["2027-02", "2027-01", "2026-12"]);
  });
});
