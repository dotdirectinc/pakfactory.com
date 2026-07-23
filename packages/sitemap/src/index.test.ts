import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildSitemapIndex,
  buildUrlset,
  xmlResponse,
  SITEMAP_GROUP_SIZE,
  type SitemapUrlEntry,
} from "./index.ts";

// ── XML escaping ────────────────────────────────────────────────────────────
// The reason this package exists: `apps/www` shipped its own inline urlset
// builder with no escaping, so a `&` in any URL produced invalid XML that
// Search Console rejects. These tests pin the behaviour for both consumers.

test("escapes the five XML entities in <loc>", () => {
  const xml = buildUrlset([
    { loc: "https://x.test/a?b=1&c=2" },
    { loc: "https://x.test/<tag>" },
    { loc: `https://x.test/"quote"` },
    { loc: "https://x.test/'apos'" },
  ]);
  assert.match(xml, /a\?b=1&amp;c=2/);
  assert.match(xml, /&lt;tag&gt;/);
  assert.match(xml, /&quot;quote&quot;/);
  assert.match(xml, /&apos;apos&apos;/);
  // A bare ampersand must never survive — that is the invalid-XML case.
  assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;)/.test(xml));
});

test("escapes image locs too", () => {
  const xml = buildUrlset([
    { loc: "https://x.test/p", images: ["https://cdn.test/i.jpg?a=1&b=2"] },
  ]);
  assert.match(xml, /i\.jpg\?a=1&amp;b=2/);
  assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;)/.test(xml));
});

test("escapes sitemap index locs", () => {
  const xml = buildSitemapIndex([{ loc: "https://x.test/s.xml?v=1&w=2" }]);
  assert.match(xml, /s\.xml\?v=1&amp;w=2/);
});

// ── urlset shape ────────────────────────────────────────────────────────────

test("emits only <loc> when nothing else is provided", () => {
  const xml = buildUrlset([{ loc: "https://x.test/a" }]);
  assert.match(xml, /<url>\s*<loc>https:\/\/x\.test\/a<\/loc>\s*<\/url>/);
  assert.ok(!xml.includes("<lastmod>"));
});

test("emits lastmod when present", () => {
  const entry: SitemapUrlEntry = { loc: "https://x.test/a", lastmod: "2026-07-22" };
  assert.match(buildUrlset([entry]), /<lastmod>2026-07-22<\/lastmod>/);
});

// PROD-2194 — Google ignores <changefreq> and <priority>, and before removal
// every blog post emitted the identical pair, so they carried no information.
// They are gone from the entry type; this pins the output contract so nobody
// reintroduces them via a loosely-typed caller.
test("never emits changefreq or priority", () => {
  const xml = buildUrlset([
    { loc: "https://x.test/a", lastmod: "2026-07-22" },
    { loc: "https://x.test/b", images: ["https://cdn.test/i.jpg"] },
  ]);
  assert.ok(!xml.includes("<changefreq>"));
  assert.ok(!xml.includes("<priority>"));
});

// ── image namespace ─────────────────────────────────────────────────────────

test("declares the image namespace only when an entry carries images", () => {
  const withImages = buildUrlset([{ loc: "https://x.test/a", images: ["https://cdn.test/i.jpg"] }]);
  assert.match(withImages, /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/);
  assert.match(withImages, /<image:image>\s*<image:loc>https:\/\/cdn\.test\/i\.jpg<\/image:loc>/);

  const without = buildUrlset([{ loc: "https://x.test/a" }]);
  assert.ok(!without.includes("xmlns:image"));
});

test("an empty images array does not declare the namespace", () => {
  assert.ok(!buildUrlset([{ loc: "https://x.test/a", images: [] }]).includes("xmlns:image"));
});

// ── XSL processing instruction ──────────────────────────────────────────────

test("adds the stylesheet PI only when an href is given", () => {
  const styled = buildUrlset([{ loc: "https://x.test/a" }], "https://x.test/sitemap.xsl");
  assert.match(styled, /<\?xml-stylesheet type="text\/xsl" href="https:\/\/x\.test\/sitemap\.xsl"\?>/);
  assert.ok(!buildUrlset([{ loc: "https://x.test/a" }]).includes("xml-stylesheet"));
});

test("the XML declaration always comes first", () => {
  for (const xml of [
    buildUrlset([{ loc: "https://x.test/a" }], "https://x.test/s.xsl"),
    buildSitemapIndex([{ loc: "https://x.test/s.xml" }], "https://x.test/s.xsl"),
  ]) {
    assert.ok(xml.startsWith(`<?xml version="1.0" encoding="UTF-8"?>\n`));
  }
});

// ── sitemap index ───────────────────────────────────────────────────────────

test("index emits sitemap entries with optional lastmod", () => {
  const xml = buildSitemapIndex([
    { loc: "https://x.test/a.xml", lastmod: "2026-07-22" },
    { loc: "https://x.test/b.xml" },
  ]);
  assert.match(xml, /<sitemapindex xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.equal(xml.match(/<sitemap>/g)?.length, 2);
  assert.equal(xml.match(/<lastmod>/g)?.length, 1);
});

// ── response wrapper ────────────────────────────────────────────────────────

test("xmlResponse sets content type and s-maxage", async () => {
  const res = xmlResponse(buildUrlset([{ loc: "https://x.test/a" }]), 60);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Type"), "application/xml; charset=utf-8");
  assert.equal(
    res.headers.get("Cache-Control"),
    "public, s-maxage=60, stale-while-revalidate",
  );
  assert.match(await res.text(), /<urlset/);
});

test("group size is the documented default", () => {
  assert.equal(SITEMAP_GROUP_SIZE, 200);
});
