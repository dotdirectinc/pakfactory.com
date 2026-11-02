/**
 * The same resolver under origin-root hosting — no `BLOG_BASE_PATH` (PROD-3236).
 *
 * This is what staging and preview deploys serve, and what the blog served
 * before the move to `pakfactory.com/blog`. It is a separate file because
 * `BLOG_BASE_PATH` is a module-level const read at import time: one process
 * can only ever observe one configuration, and `node --test` gives each file
 * its own process.
 *
 * Its job is to prove the base path is load-bearing. Every assertion here is
 * the same call as in `resolve-seo.test.ts` with a different answer — so a
 * shared resolver that resolved URLs with www's `absoluteUrl` (which has the
 * same name and never prefixes anything) would pass this file and silently
 * rewrite every canonical in production.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.NEXT_PUBLIC_SITE_URL = "https://pakfactory.com";
process.env.NEXT_PUBLIC_BLOG_BASE_PATH = "";
delete process.env.BLOG_DISABLE_INDEXING;

const load = () => import("@/lib/resolve-seo");

describe("origin-root hosting — the same inputs, different URLs", () => {
  it("drops the /blog prefix a production canonical would carry", async () => {
    const { resolveCanonicalUrl } = await load();
    assert.equal(
      resolveCanonicalUrl(null, "/sustainability"),
      "https://pakfactory.com/sustainability",
    );
  });

  it("still gives the home page no trailing slash", async () => {
    const { resolveCanonicalUrl } = await load();
    assert.equal(resolveCanonicalUrl(null, "/"), "https://pakfactory.com");
  });

  it("resolves an editor's relative canonical against the origin", async () => {
    const { resolveCanonicalUrl } = await load();
    assert.equal(
      resolveCanonicalUrl("design-and-structure", "/ignored"),
      "https://pakfactory.com/design-and-structure",
    );
  });

  it("carries the configuration into og:url as well as the canonical", async () => {
    const { buildDocMetadata } = await load();
    const meta = buildDocMetadata({
      title: "Packaging Design & Structure",
      selfCanonicalPath: "/design-and-structure",
      seo: {},
    });

    assert.equal(
      meta.alternates?.canonical,
      "https://pakfactory.com/design-and-structure",
    );
    assert.equal(meta.openGraph?.url, meta.alternates?.canonical);
  });

  it("leaves an absolute canonical alone — the base path never applies to one", async () => {
    const { resolveCanonicalUrl } = await load();
    assert.equal(
      resolveCanonicalUrl("https://example.com/elsewhere", "/ignored"),
      "https://example.com/elsewhere",
    );
  });
});
