import assert from "node:assert/strict";
import { test } from "node:test";
import { parse } from "groq-js";
import * as catalog from "./catalog.ts";
import * as solutions from "./solutions.ts";

// Every exported query is a string until Sanity reads it, so a syntax slip only shows up as a
// page that fails to load (it happened: `productStyle[._ref …]`, PROD-2605). Parse them all.
for (const [file, mod] of Object.entries({ catalog, solutions })) {
  for (const [name, value] of Object.entries(mod)) {
    if (!name.endsWith("_QUERY") || typeof value !== "string") continue;
    test(`${file}.${name} parses as GROQ`, () => {
      assert.doesNotThrow(() => parse(value), `${name} is not valid GROQ`);
    });
  }
}

/**
 * Pins the shape of the gates, not just their text. Every one of them must NAME the
 * states that are visible — a gate written as an exclusion (`status != "not-active"`)
 * leaks the next value anyone adds to the vocabulary (PROD-2845, R6).
 */
test("every status gate is a whitelist, never an exclusion", () => {
  const gates = {
    LISTED_STATUS: catalog.LISTED_STATUS,
    HAS_PAGE_STATUS: catalog.HAS_PAGE_STATUS,
    ORDERABLE_STATUS: catalog.ORDERABLE_STATUS,
    LINE_STYLE_LISTED: catalog.LINE_STYLE_LISTED,
    LINE_STYLE_HAS_PAGE: catalog.LINE_STYLE_HAS_PAGE,
    LINE_STYLE_ACTIVE: catalog.LINE_STYLE_ACTIVE,
    SOLUTION_ACTIVE: catalog.SOLUTION_ACTIVE,
    CUSTOMIZATION_TAXONOMY_ACTIVE: catalog.CUSTOMIZATION_TAXONOMY_ACTIVE,
  };
  for (const [name, gate] of Object.entries(gates)) {
    assert.ok(gate, `${name} is missing`);
    assert.ok(!gate.includes("!="), `${name} excludes a value instead of naming what shows`);
    assert.ok(
      !gate.includes("not-active") && !gate.includes("active-internal") ||
        name === "LINE_STYLE_LISTED",
      `${name} should not need to name an off state`,
    );
  }
});

test("customerFacing is gone from the catalog gates", () => {
  const source = Object.values(catalog)
    .filter((v): v is string => typeof v === "string")
    .join("\n");
  assert.ok(!source.includes("customerFacing"), "a gate still reads customerFacing");
});

/** The one gate with no unset arm — an un-migrated solution must read as page-less. */
test("SOLUTION_ACTIVE does not treat an unset status as active", () => {
  assert.equal(catalog.SOLUTION_ACTIVE, 'status == "active"');
  assert.ok(!catalog.SOLUTION_ACTIVE.includes("!defined"));
});
