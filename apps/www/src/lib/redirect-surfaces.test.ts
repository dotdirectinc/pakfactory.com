import assert from "node:assert/strict";
import { test } from "node:test";
import { isWwwRedirect } from "./redirect-surfaces";

test("case-study redirects apply as before (a plain starts-with)", () => {
    assert.equal(isWwwRedirect("/case-studies/old-slug"), true);
    assert.equal(isWwwRedirect("/case-studies"), true);
});

test("catalog redirects apply: a structure move's old path (PROD-3098)", () => {
    assert.equal(isWwwRedirect("/products/boxes/sleeve"), true);
    assert.equal(isWwwRedirect("/solutions/coffee/coffee-bags"), true);
    assert.equal(isWwwRedirect("/customizations/finishes/gloss"), true);
    assert.equal(isWwwRedirect("/products"), true);
});

test("a catalog surface claims whole path segments only, and other apps' paths stay theirs", () => {
    assert.equal(isWwwRedirect("/products-guide"), false);
    assert.equal(isWwwRedirect("/blog/some-post"), false);
    assert.equal(isWwwRedirect("glossy"), false); // a phrase rule
});
