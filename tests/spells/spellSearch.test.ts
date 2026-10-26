import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { SpellSearch } from "../../src/modules/spells/lib/spellSearch.js";

const spells = [
  { id: 1, name: "Обезоруживающее заклятие", incantations: ["Экспеллиармус"] },
  { id: 2, name: "Заклинание Патронуса", incantations: ["Экспекто Патронум"] },
  { id: 3, name: "Чары левитации", incantations: ["Вингардиум Левиоса"] },
  { id: 4, name: "Чары света", incantations: ["Люмос", "Люмос Максима"] },
  { id: 5, name: "Огненные чары", incantations: ["Инсендио"] },
  { id: 6, name: "Призывающие чары", incantations: ["Акцио"] },
];

const first = (query: string) => SpellSearch.find(spells, query)[0]?.item.id;

describe("SpellSearch", () => {
  it("finds exact names and incantations", () => {
    assert.equal(first("Инсендио"), 5);
    assert.equal(first("чары света"), 4);
  });

  it("finds partial words", () => {
    assert.equal(first("экспел"), 1);
    assert.equal(first("левиоса"), 3);
    assert.equal(first("патрон"), 2);
  });

  it("forgives typos, swapped and missing letters", () => {
    assert.equal(first("экспелиармус"), 1);
    assert.equal(first("эскпеллиармус"), 1);
    assert.equal(first("вингардиум левиоза"), 3);
    assert.equal(first("инсендо"), 5);
    assert.equal(first("акцыо"), 6);
  });

  it("understands a query typed in the English layout", () => {
    assert.equal(first("'rcgtkkbfhvec"), 1);
    assert.equal(first("k.vjc"), 4);
  });

  it("treats ё as е and ignores punctuation", () => {
    assert.equal(SpellSearch.normalize("Ёж, привет!"), "еж привет");
  });

  it("returns nothing for unrelated text", () => {
    assert.deepEqual(SpellSearch.find(spells, "квиддич"), []);
    assert.deepEqual(SpellSearch.find(spells, "   "), []);
  });

  it("counts a transposition as one edit", () => {
    assert.equal(SpellSearch.distance("ab", "ba"), 1);
    assert.equal(SpellSearch.distance("люмос", "люмсо"), 1);
  });
});
