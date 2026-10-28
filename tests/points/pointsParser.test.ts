import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PointsParser } from "../../src/modules/points/lib/pointsParser.js";

describe("PointsParser", () => {
  it("reads the basic forms", () => {
    assert.deepEqual(PointsParser.parse("+10 Гриффиндор"), [{ faculty: "GRYFFINDOR", delta: 10 }]);
    assert.deepEqual(PointsParser.parse("-5 Слизерину"), [{ faculty: "SLYTHERIN", delta: -5 }]);
    assert.deepEqual(PointsParser.parse("−15 очков Когтеврану"), [{ faculty: "RAVENCLAW", delta: -15 }]);
    assert.deepEqual(PointsParser.parse("+ 20 баллов факультету Пуффендуй"), [{ faculty: "HUFFLEPUFF", delta: 20 }]);
  });

  it("finds changes inside roleplay text and markdown", () => {
    assert.deepEqual(
      PointsParser.parse("Профессор кивнула. **+10 Когтевран** за верный ответ, и *-3 Гриффиндор* за болтовню."),
      [
        { faculty: "RAVENCLAW", delta: 10 },
        { faculty: "GRYFFINDOR", delta: -3 },
      ],
    );
  });

  it("sums several changes for one house", () => {
    assert.deepEqual(PointsParser.parse("+5 грифф, +5 Гриффиндору, -2 гриффиндор"), [{ faculty: "GRYFFINDOR", delta: 8 }]);
  });

  it("understands short and english names", () => {
    assert.deepEqual(PointsParser.parse("+3 слиз"), [{ faculty: "SLYTHERIN", delta: 3 }]);
    assert.deepEqual(PointsParser.parse("+7 Hufflepuff"), [{ faculty: "HUFFLEPUFF", delta: 7 }]);
    assert.deepEqual(PointsParser.parse("+4 Хаффлпаффу, -1 Рейвенкло"), [
      { faculty: "HUFFLEPUFF", delta: 4 },
      { faculty: "RAVENCLAW", delta: -1 },
    ]);
  });

  it("ignores text without a sign, unknown houses and huge numbers", () => {
    assert.deepEqual(PointsParser.parse("10 Гриффиндор"), []);
    assert.deepEqual(PointsParser.parse("+5 министерству магии"), []);
    assert.deepEqual(PointsParser.parse("+9999 Слизерин"), []);
    assert.deepEqual(PointsParser.parse("2+2 гриффиндор"), []);
    assert.deepEqual(PointsParser.parse("+5 Гриффиндор -5 Гриффиндор"), []);
  });
});
