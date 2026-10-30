import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HalloweenRules } from "../../src/modules/halloween/lib/halloweenRules.js";
import { HalloweenChoice, HalloweenError } from "../../src/modules/halloween/types/halloween.js";

describe("HalloweenRules.answer", () => {
  it("recognises magic and life in any form", () => {
    assert.equal(HalloweenRules.answer("Магия!"), HalloweenChoice.Magic);
    assert.equal(HalloweenRules.answer("выбираю магию"), HalloweenChoice.Magic);
    assert.equal(HalloweenRules.answer("ЖИЗНЬ"), HalloweenChoice.Life);
    assert.equal(HalloweenRules.answer("конечно жизнь, что за вопрос"), HalloweenChoice.Life);
    assert.equal(HalloweenRules.answer("life"), HalloweenChoice.Life);
  });

  it("ignores unrelated or ambiguous replies", () => {
    assert.equal(HalloweenRules.answer("о, тыква"), null);
    assert.equal(HalloweenRules.answer("и магия, и жизнь"), null);
    assert.equal(HalloweenRules.answer("гимагия"), null);
  });
});

describe("HalloweenRules ranges", () => {
  it("reads ranges and single numbers", () => {
    assert.deepEqual(HalloweenRules.range("30-90", "Интервал", 5, 720), [30, 90]);
    assert.deepEqual(HalloweenRules.range("15", "Интервал", 5, 720), [15, 15]);
    assert.deepEqual(HalloweenRules.range("2 до 6", "Конфеты", 1, 100), [2, 6]);
  });

  it("rejects bad ranges", () => {
    assert.throws(() => HalloweenRules.range("90-30", "Интервал", 5, 720), HalloweenError);
    assert.throws(() => HalloweenRules.range("1-2", "Интервал", 5, 720), HalloweenError);
    assert.throws(() => HalloweenRules.range("много", "Интервал", 5, 720), HalloweenError);
  });

  it("schedules the next drop inside the interval", () => {
    const now = new Date("2026-10-31T12:00:00Z");

    assert.equal(HalloweenRules.nextDrop(now, 30, 90, () => 0).getTime(), now.getTime() + 30 * 60_000);
    assert.equal(HalloweenRules.nextDrop(now, 30, 90, () => 0.9999).getTime(), now.getTime() + 90 * 60_000);
  });
});
