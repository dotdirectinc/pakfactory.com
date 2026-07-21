import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildRuleset,
  normalizePath,
  resolveRedirect,
  stripBasePath,
  toAbsolute,
  type RedirectRow,
} from "./index.ts";

// Blog surface (basePath "/blog") — mirrors apps/blog/src/proxy.ts.
const blog = (rows: RedirectRow[]) => buildRuleset(rows, "/blog");
// www surface (no basePath, scoped to /case-studies) — mirrors apps/www/src/proxy.ts.
const www = (rows: RedirectRow[]) => buildRuleset(rows, "", "/case-studies");

test("normalizePath: leading slash, strip trailing (except root)", () => {
  assert.equal(normalizePath("foo/"), "/foo");
  assert.equal(normalizePath("/foo/bar//"), "/foo/bar");
  assert.equal(normalizePath("/"), "/");
  assert.equal(normalizePath(""), "/");
});

test("stripBasePath: base-path-less form", () => {
  assert.equal(stripBasePath("/blog/x", "/blog"), "/x");
  assert.equal(stripBasePath("/blog", "/blog"), "/");
  assert.equal(stripBasePath("/case-studies/x", "/blog"), "/case-studies/x");
  assert.equal(stripBasePath("/x", ""), "/x");
});

test("toAbsolute: internal joined to origin, external untouched", () => {
  assert.equal(toAbsolute("/case-studies/y", "https://pakfactory.com"), "https://pakfactory.com/case-studies/y");
  assert.equal(toAbsolute("https://other.com/z", "https://pakfactory.com"), "https://other.com/z");
});

test("exact match, permanent 301 (blog basePath stripped)", () => {
  const rs = blog([{ from: "/blog/old", to: "/blog/new", behaviour: "permanent" }]);
  assert.deepEqual(resolveRedirect(rs, "/old", "/blog"), { destination: "/blog/new", status: 301 });
  assert.equal(resolveRedirect(rs, "/nope", "/blog"), null);
});

test("defaults to permanent 301 when behaviour is absent", () => {
  const rs = blog([{ from: "/blog/a", to: "/blog/b" }]);
  assert.deepEqual(resolveRedirect(rs, "/a", "/blog"), { destination: "/blog/b", status: 301 });
});

test("prefix with appendMatchedTail keeps the tail", () => {
  const rs = blog([
    { from: "/blog/tag", to: "/blog/topics", matchType: "prefix", appendMatchedTail: true, behaviour: "permanent" },
  ]);
  assert.deepEqual(resolveRedirect(rs, "/tag/coffee", "/blog"), { destination: "/blog/topics/coffee", status: 301 });
  assert.deepEqual(resolveRedirect(rs, "/tag", "/blog"), { destination: "/blog/topics", status: 301 });
});

test("prefix without tail lands everything on one page", () => {
  const rs = blog([
    { from: "/blog/promo", to: "/blog/campaign", matchType: "prefix", behaviour: "permanent" },
  ]);
  assert.deepEqual(resolveRedirect(rs, "/promo/a/b", "/blog"), { destination: "/blog/campaign", status: 301 });
});

test("phrase (contains) matches raw path", () => {
  const rs = blog([{ from: "/feed/", to: "/blog/rss.xml", matchType: "phrase", behaviour: "permanent" }]);
  assert.deepEqual(resolveRedirect(rs, "/some/feed/thing", "/blog"), { destination: "/blog/rss.xml", status: 301 });
});

test("410 gone returns null destination", () => {
  const rs = blog([{ from: "/blog/dead", behaviour: "gone" }]);
  assert.deepEqual(resolveRedirect(rs, "/dead", "/blog"), { destination: null, status: 410 });
});

test("precedence: exact beats prefix beats phrase", () => {
  const rs = blog([
    { from: "/x/y", to: "/blog/exact", behaviour: "permanent" },
    { from: "/x", to: "/blog/prefix", matchType: "prefix", behaviour: "permanent" },
    { from: "/x", to: "/blog/phrase", matchType: "phrase", behaviour: "permanent" },
  ]);
  assert.equal(resolveRedirect(rs, "/x/y", "/blog")?.destination, "/blog/exact");
  assert.equal(resolveRedirect(rs, "/x/z", "/blog")?.destination, "/blog/prefix");
});

test("chain follow collapses exact hops; any temporary hop → 302", () => {
  const rs = blog([
    { from: "/blog/a", to: "/blog/b", behaviour: "permanent" },
    { from: "/blog/b", to: "/blog/c", behaviour: "temporary" },
  ]);
  assert.deepEqual(resolveRedirect(rs, "/a", "/blog"), { destination: "/blog/c", status: 302 });
});

test("self-referential exact is skipped (no loop)", () => {
  const rs = blog([{ from: "/blog/same", to: "/blog/same", behaviour: "permanent" }]);
  assert.equal(resolveRedirect(rs, "/same", "/blog"), null);
});

test("cross-channel: blog→case-studies fires on the blog surface, emits absolute", () => {
  // The 36 real redirects: channel "website" but /blog from → owned by the blog proxy.
  const rows: RedirectRow[] = [
    { from: "/blog/1canoe2-post", to: "/case-studies", behaviour: "permanent" },
  ];
  const hit = resolveRedirect(blog(rows), "/1canoe2-post", "/blog");
  assert.deepEqual(hit, { destination: "/case-studies", status: 301 });
  assert.equal(toAbsolute(hit!.destination!, "https://pakfactory.com"), "https://pakfactory.com/case-studies");
});

test("surfacePrefix scopes www to /case-studies froms only", () => {
  const rows: RedirectRow[] = [
    { from: "/blog/x", to: "/blog/y", behaviour: "permanent" }, // blog surface
    { from: "/case-studies/old", to: "/case-studies/new", behaviour: "permanent" }, // www surface
  ];
  const rs = www(rows);
  // Blog rule is filtered OUT of the www ruleset...
  assert.equal(resolveRedirect(rs, "/blog/x", ""), null);
  // ...case-study rule resolves.
  assert.deepEqual(resolveRedirect(rs, "/case-studies/old", ""), {
    destination: "/case-studies/new",
    status: 301,
  });
});

test("surfacePrefix blocks a blog phrase rule from leaking into www", () => {
  // A generic blog phrase that would otherwise match a case-study path.
  const rows: RedirectRow[] = [{ from: "/old", to: "/blog/z", matchType: "phrase", behaviour: "permanent" }];
  const rs = www(rows);
  assert.equal(resolveRedirect(rs, "/case-studies/old-client", ""), null);
});
