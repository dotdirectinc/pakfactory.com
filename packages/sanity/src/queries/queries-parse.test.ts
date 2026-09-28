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

test("CUSTOMER_FACING keeps hidden documents out and treats a missing flag as visible", () => {
  assert.equal(catalog.CUSTOMER_FACING, "customerFacing != false");
});
