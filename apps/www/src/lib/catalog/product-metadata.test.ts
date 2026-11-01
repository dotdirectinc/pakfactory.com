import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildProductSocialMetadata,
  productCanonicalPath,
  productLineCanonicalPath,
  resolveProductLineOgImageUrl,
  resolveProductOgImageUrl,
} from "./product-metadata";
import type { Product, ProductLine } from "./types";

const DEFAULT_OG = "https://cdn.sanity.io/default-og.png";

const product = (media: { src?: string; alt: string }[]) =>
  ({ slug: "watch-box", media }) as Pick<Product, "media" | "slug">;

describe("product share cards — the picture must match the markup", () => {
  it("shares the first media frame, the same one Product.image leads with", () => {
    const url = resolveProductOgImageUrl(
      product([
        { src: "https://cdn.sanity.io/front.png", alt: "front" },
        { src: "https://cdn.sanity.io/open.png", alt: "open" },
      ]),
      DEFAULT_OG,
    );
    assert.equal(url, "https://cdn.sanity.io/front.png");
  });

  it("skips a frame with no src rather than sharing nothing", () => {
    const url = resolveProductOgImageUrl(
      product([
        { alt: "a video slide with no still" },
        { src: "https://cdn.sanity.io/open.png", alt: "open" },
      ]),
      DEFAULT_OG,
    );
    assert.equal(url, "https://cdn.sanity.io/open.png");
  });

  it("falls back to the branded default when a product has no media", () => {
    assert.equal(resolveProductOgImageUrl(product([]), DEFAULT_OG), DEFAULT_OG);
  });

  it("returns undefined when there is no image anywhere, never an empty string", () => {
    assert.equal(resolveProductOgImageUrl(product([]), null), undefined);
    assert.equal(resolveProductOgImageUrl(product([]), "   "), undefined);
  });

  it("uses a line's own image before the site default", () => {
    const line = { imageUrl: "https://cdn.sanity.io/line.png" } as Pick<
      ProductLine,
      "imageUrl"
    >;
    assert.equal(resolveProductLineOgImageUrl(line, DEFAULT_OG), line.imageUrl);
    assert.equal(
      resolveProductLineOgImageUrl({ imageUrl: null }, DEFAULT_OG),
      DEFAULT_OG,
    );
  });
});

describe("product share cards — shape", () => {
  // Next's Twitter metadata type is a union and `card` is not on every member,
  // so read it through a narrow shape rather than widening the assertion.
  const cardOf = (meta: ReturnType<typeof buildProductSocialMetadata>) =>
    (meta.twitter as { card?: string } | undefined)?.card;

  it("asks for a large card when there is an image, a small one when not", () => {
    const withImage = buildProductSocialMetadata({
      title: "Watch Box",
      canonicalPath: "/products/watch-box",
      ogImageUrl: "https://cdn.sanity.io/front.png",
    });
    assert.equal(cardOf(withImage), "summary_large_image");

    const without = buildProductSocialMetadata({
      title: "Watch Box",
      canonicalPath: "/products/watch-box",
    });
    assert.equal(cardOf(without), "summary");
    assert.equal("images" in (without.openGraph ?? {}), false);
  });

  it("sends an absolute og:url, because relative ones do not resolve off-site", () => {
    const meta = buildProductSocialMetadata({
      title: "Watch Box",
      canonicalPath: "/products/watch-box",
    });
    const url = String(
      (meta.openGraph as { url?: unknown } | undefined)?.url ?? "",
    );
    assert.ok(url.startsWith("http"), `expected absolute, got ${url}`);
    assert.ok(url.endsWith("/products/watch-box"));
  });

  it("builds canonical paths for both page shapes this route serves", () => {
    assert.equal(
      productCanonicalPath({ slug: "watch-box" }),
      "/products/watch-box",
    );
    assert.equal(
      productLineCanonicalPath({ slug: "rigid-boxes" }),
      "/products/rigid-boxes",
    );
  });
});
