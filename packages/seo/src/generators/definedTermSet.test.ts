import { test } from "node:test";
import assert from "node:assert/strict";
import { definedTermSet } from "./definedTermSet.ts";

test("definedTermSet lists its terms by id", () => {
  const node = definedTermSet({
    id: "https://pakfactory.com/glossary#glossary",
    name: "Packaging glossary",
    url: "https://pakfactory.com/glossary",
    description: "Terms used across PakFactory packaging.",
    hasDefinedTerm: [
      { "@id": "https://pakfactory.com/glossary/lamination#term" },
      { "@id": "https://pakfactory.com/glossary/chipboard#term" },
    ],
  });

  assert.equal(node["@type"], "DefinedTermSet");
  assert.equal(node.name, "Packaging glossary");
  assert.deepEqual(node.hasDefinedTerm, [
    { "@id": "https://pakfactory.com/glossary/lamination#term" },
    { "@id": "https://pakfactory.com/glossary/chipboard#term" },
  ]);
});

test("definedTermSet omits an empty term list", () => {
  const node = definedTermSet({
    name: "Packaging glossary",
    url: "https://pakfactory.com/glossary",
    hasDefinedTerm: [],
  });

  assert.equal(node.hasDefinedTerm, undefined);
  assert.equal(node.description, undefined);
  assert.equal(node["@id"], undefined);
});
