import { test } from "node:test";
import assert from "node:assert/strict";
import { definedTerm } from "./definedTerm.ts";

test("definedTerm emits the term, its definition and its synonyms", () => {
  const node = definedTerm({
    id: "https://pakfactory.com/glossary/lamination#term",
    name: "Lamination",
    url: "https://pakfactory.com/glossary/lamination",
    description: "A thin film bonded to a printed sheet.",
    alternateName: ["Laminate", "Film lamination"],
    inDefinedTermSet: { "@id": "https://pakfactory.com/glossary#glossary" },
  });

  assert.equal(node["@type"], "DefinedTerm");
  assert.equal(node.name, "Lamination");
  assert.equal(node.description, "A thin film bonded to a printed sheet.");
  assert.deepEqual(node.alternateName, ["Laminate", "Film lamination"]);
  assert.deepEqual(node.inDefinedTermSet, {
    "@id": "https://pakfactory.com/glossary#glossary",
  });
});

test("definedTerm omits an empty synonym list rather than emitting []", () => {
  const node = definedTerm({
    name: "Chipboard",
    url: "https://pakfactory.com/glossary/chipboard",
    alternateName: ["   "],
  });

  assert.equal(node.alternateName, undefined);
  assert.equal(node.description, undefined);
  assert.equal(node.inDefinedTermSet, undefined);
});
