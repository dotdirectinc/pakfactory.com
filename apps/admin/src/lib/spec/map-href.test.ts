import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapHref, parseMapFocus } from "./map-href";

describe("Show on Map links", () => {
  it("round-trips a record, ids with dots and colons included", () => {
    const href = mapHref("productStyle", "style-a.b:c");
    const q = new URL(href, "http://x").searchParams.get("focus") ?? undefined;
    assert.deepEqual(parseMapFocus(q), { level: "productStyle", id: "style-a.b:c" });
  });
  it("ignores anything that is not level:id", () => {
    assert.equal(parseMapFocus(undefined), null);
    assert.equal(parseMapFocus("product"), null);
    assert.equal(parseMapFocus(":x"), null);
  });
});
