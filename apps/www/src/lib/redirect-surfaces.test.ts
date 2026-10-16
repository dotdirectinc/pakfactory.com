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

test("a catalog destination stays on the host that was asked; case studies keep the site URL", async () => {
    const { redirectBase } = await import("./redirect-surfaces");
    const site = "https://pakfactory.com";
    assert.equal(redirectBase("/solutions/gifting/x", "https://staging.pakfactory.com", site), "https://staging.pakfactory.com");
    assert.equal(redirectBase("/products/boxes/sleeve?a=1", "https://preview.vercel.app", site), "https://preview.vercel.app");
    assert.equal(redirectBase("/case-studies/new-slug", "https://origin.case-studies.pakfactory.com", site), site);
    assert.equal(redirectBase("https://elsewhere.com/x", "https://staging.pakfactory.com", site), site); // absolute: toAbsolute keeps it as is
});
