/**
 * Characterization tests for the blog's SEO metadata resolver (PROD-3236).
 *
 * These describe what `resolve-seo.ts` does TODAY on the live blog, so that
 * PROD-2990 step 5 — lifting it into `packages/seo` — has to prove it still
 * does it. They are not a specification. Where the current behaviour is
 * asymmetric the test records the asymmetry rather than asserting what it
 * ought to be; changing it is a separate decision, not a refactor.
 *
 * Config here is production: `NEXT_PUBLIC_BLOG_BASE_PATH=/blog`, which is what
 * pakfactory.com/blog actually serves. `BLOG_BASE_PATH` is a module-level const
 * read at import time, so the env has to be set before the module loads — hence
 * `await import()` inside each test rather than a static import, which esbuild
 * hoists above these assignments. The origin-root configuration cannot share a
 * process with this one; it lives in `resolve-seo.origin-root.test.ts`.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.NEXT_PUBLIC_SITE_URL = "https://pakfactory.com";
process.env.NEXT_PUBLIC_BLOG_BASE_PATH = "/blog";
delete process.env.BLOG_DISABLE_INDEXING;

const load = () => import("@/lib/resolve-seo");

/** The shape every page passes in, with nothing overridden. */
const base = {
  title: "Packaging Design & Structure",
  selfCanonicalPath: "/design-and-structure",
  seo: {},
};

describe("canonical URLs — the base path is part of the identity", () => {
  it("sends a blank canonical to the page's own URL, base path included", async () => {
    const { resolveCanonicalUrl } = await load();
    assert.equal(
      resolveCanonicalUrl(null, "/sustainability"),
      "https://pakfactory.com/blog/sustainability",
    );
  });

  it("resolves an editor's relative canonical against the blog, not the site root", async () => {
    const { resolveCanonicalUrl } = await load();
    assert.equal(
      resolveCanonicalUrl("design-and-structure", "/ignored"),
      "https://pakfactory.com/blog/design-and-structure",
    );
  });

  it("passes a full URL through untouched, so a canonical can point off-site", async () => {
    const { resolveCanonicalUrl } = await load();
    assert.equal(
      resolveCanonicalUrl("  https://example.com/elsewhere  ", "/ignored"),
      "https://example.com/elsewhere",
    );
  });

  it("gives the blog home no trailing slash — this is where www's absoluteUrl differs", async () => {
    const { resolveCanonicalUrl } = await load();
    assert.equal(resolveCanonicalUrl(null, "/"), "https://pakfactory.com/blog");
  });
});

describe("robots — a document may tighten the baseline, never loosen it", () => {
  it("indexes and follows when a document says nothing", async () => {
    const { resolveDocRobots } = await load();
    assert.deepEqual(resolveDocRobots({}), { index: true, follow: true });
  });

  it("refuses to re-index a page the route rules already excluded", async () => {
    const { resolveDocRobots } = await load();
    const robots = resolveDocRobots(
      { allowIndex: true },
      { index: false, follow: true },
    );
    assert.equal(robots.index, false);
  });

  it("lets a document opt itself out of an otherwise indexable route", async () => {
    const { resolveDocRobots } = await load();
    const robots = resolveDocRobots({ allowIndex: false, allowFollow: false });
    assert.deepEqual(robots, { index: false, follow: false });
  });

  it("sets noImageIndex when either the route or the document asks for it", async () => {
    const { resolveDocRobots } = await load();
    assert.equal(resolveDocRobots({ noImageIndex: true }).noImageIndex, true);
    assert.equal(
      resolveDocRobots({}, { index: true, follow: true, noImageIndex: true })
        .noImageIndex,
      true,
    );
  });
});

describe("titles and descriptions — the fallback chains", () => {
  it("suffixes the page title when there is no metaTitle, matching live output", async () => {
    const { buildDocMetadata } = await load();
    const meta = buildDocMetadata(base);
    assert.equal(meta.title, "Packaging Design & Structure | PakFactory Blog");
  });

  it("lets metaTitle replace the whole title, suffix included", async () => {
    const { buildDocMetadata } = await load();
    const meta = buildDocMetadata({
      ...base,
      seo: { metaTitle: "A title an editor wrote" },
    });
    assert.equal(meta.title, "A title an editor wrote");
  });

  it("applies a Blog Settings format string only while metaTitle is blank", async () => {
    const { buildDocMetadata } = await load();
    const withFormat = {
      ...base,
      metaTitleFormat: "%title% — PakFactory",
      formatTokens: { title: "Corrugated" },
    };

    assert.equal(buildDocMetadata(withFormat).title, "Corrugated — PakFactory");
    assert.equal(
      buildDocMetadata({ ...withFormat, seo: { metaTitle: "Editor wins" } })
        .title,
      "Editor wins",
    );
  });

  it("truncates the meta description at 160 characters but leaves og:description whole", async () => {
    const { buildDocMetadata } = await load();
    const long = "x".repeat(400);
    const meta = buildDocMetadata({ ...base, descriptionFallback: long });

    assert.equal(meta.description, "x".repeat(160));
    assert.equal(meta.openGraph?.description, long);
  });

  it("falls og:title back to the bare page title, without the suffix", async () => {
    const { buildDocMetadata } = await load();
    const meta = buildDocMetadata(base);

    assert.equal(meta.openGraph?.title, "Packaging Design & Structure");
    assert.notEqual(meta.openGraph?.title, meta.title);
  });

  it("drops description entirely rather than emitting an empty one", async () => {
    const { buildDocMetadata } = await load();
    const meta = buildDocMetadata(base);

    assert.equal(meta.description, undefined);
    assert.equal(meta.openGraph?.description, undefined);
  });
});

describe("share cards", () => {
  it("falls the social image back from the document, to the hero, to the default", async () => {
    const { buildDocMetadata } = await load();
    // Next's OGImage is a union of string | descriptor | URL. This resolver only
    // ever emits the descriptor, which is itself part of what these tests pin.
    type Descriptor = { url: string; width: number; height: number };
    const images = (
      input: Parameters<typeof buildDocMetadata>[0],
    ): Descriptor[] => {
      const og = buildDocMetadata(input).openGraph;
      const list = og && "images" in og ? og.images : undefined;
      return Array.isArray(list) ? (list as Descriptor[]) : [];
    };

    assert.deepEqual(
      images({
        ...base,
        seo: { ogImageUrl: "https://cdn/doc.png" },
        featuredImageUrl: "https://cdn/hero.png",
        defaultOgImageUrl: "https://cdn/default.png",
      })[0],
      { url: "https://cdn/doc.png", width: 1200, height: 630 },
    );

    assert.equal(
      images({
        ...base,
        featuredImageUrl: "https://cdn/hero.png",
        defaultOgImageUrl: "https://cdn/default.png",
      })[0]?.url,
      "https://cdn/hero.png",
    );

    assert.equal(
      images({ ...base, defaultOgImageUrl: "https://cdn/default.png" })[0]?.url,
      "https://cdn/default.png",
    );

    assert.equal(images(base).length, 0);
  });

  it("upgrades the Twitter card to summary_large_image only when there is an image", async () => {
    const { buildDocMetadata } = await load();
    const card = (input: Parameters<typeof buildDocMetadata>[0]) =>
      (buildDocMetadata(input).twitter as { card?: string } | undefined)?.card;

    assert.equal(card(base), "summary");
    assert.equal(
      card({ ...base, defaultOgImageUrl: "https://cdn/default.png" }),
      "summary_large_image",
    );
  });

  it("repeats the canonical as og:url, so the two can never disagree", async () => {
    const { buildDocMetadata } = await load();
    const meta = buildDocMetadata(base);

    assert.equal(
      meta.openGraph?.url,
      "https://pakfactory.com/blog/design-and-structure",
    );
    assert.equal(meta.alternates?.canonical, meta.openGraph?.url);
  });

  it("names the brand, not the blog, as og:site_name — matching live output", async () => {
    const { buildDocMetadata } = await load();
    assert.equal(buildDocMetadata(base).openGraph?.siteName, "PakFactory");
  });

  it("declares the Open Graph image size the Studio fields target", async () => {
    const { OG_IMAGE_WIDTH, OG_IMAGE_HEIGHT } = await load();
    assert.equal(OG_IMAGE_WIDTH, 1200);
    assert.equal(OG_IMAGE_HEIGHT, 630);
  });
});

describe("the indexing kill switch", () => {
  it("forces noindex everywhere when BLOG_DISABLE_INDEXING is set, whatever the document says", async () => {
    const { buildDocMetadata } = await load();
    process.env.BLOG_DISABLE_INDEXING = "true";
    try {
      const meta = buildDocMetadata({ ...base, seo: { allowIndex: true } });
      assert.deepEqual(meta.robots, {
        index: false,
        follow: false,
        nocache: true,
        noimageindex: true,
      });
    } finally {
      delete process.env.BLOG_DISABLE_INDEXING;
    }
  });

  it("leaves an ordinary page indexable once the switch is off", async () => {
    const { buildDocMetadata } = await load();
    assert.deepEqual(buildDocMetadata(base).robots, {
      index: true,
      follow: true,
    });
  });
});
