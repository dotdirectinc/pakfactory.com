import { blogPostHref, wwwPath } from "./content-origins";
import type { AdminSearchHit } from "./types";
import { getAdminSanityClient } from "@/lib/sanity/client";

type ProductHit = {
  _id: string;
  title: string | null;
  shortName: string | null;
  slug: string | null;
};

type CustomizationHit = {
  _id: string;
  title: string | null;
  slug: string | null;
  typeTitle: string | null;
  categorySlug: string | null;
};

type PostHit = {
  _id: string;
  title: string | null;
  slug: string | null;
  categoryTitle: string | null;
};

type CaseStudyHit = {
  _id: string;
  title: string | null;
  slug: string | null;
  excerpt: string | null;
};

function matchTerm(query: string): string {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
  if (tokens.length === 0) return "";
  return tokens.map((t) => `${t}*`).join(" ");
}

const PRODUCT_SEARCH = /* groq */ `*[
  _type == "product" &&
  defined(slug.current) &&
  allowIndex != false &&
  (
    title match $term ||
    shortName match $term ||
    pt::text(description) match $term
  )
] | order(_score desc)[0...8]{
  _id,
  title,
  shortName,
  "slug": slug.current
}`;

const CUSTOMIZATION_SEARCH = /* groq */ `*[
  _type == "customizationOption" &&
  defined(slug.current) &&
  defined(type->category->slug.current) &&
  allowIndex != false &&
  role != "configurable" &&
  (
    title match $term ||
    shortName match $term ||
    pt::text(benefits.body) match $term
  )
] | order(_score desc)[0...8]{
  _id,
  title,
  "slug": slug.current,
  "typeTitle": type->title,
  "categorySlug": type->category->slug.current
}`;

const POST_SEARCH = /* groq */ `*[
  _type == "post" &&
  defined(slug.current) &&
  !(_id in path("drafts.**")) &&
  allowIndex != false &&
  (
    title match $term ||
    excerpt match $term ||
    pt::text(body) match $term ||
    category->title match $term
  )
] | order(_score desc)[0...8]{
  _id,
  title,
  "slug": slug.current,
  "categoryTitle": category->title
}`;

const CASE_STUDY_SEARCH = /* groq */ `*[
  _type == "caseStudy" &&
  defined(slug.current) &&
  defined(publishedAt) &&
  publishedAt <= now() &&
  allowIndex != false &&
  (
    title match $term ||
    pt::text(heroIntro) match $term ||
    pt::text(challenge) match $term ||
    pt::text(solution) match $term ||
    client->name match $term
  )
] | order(_score desc)[0...8]{
  _id,
  title,
  "slug": slug.current,
  "excerpt": client->name
}`;

export type ContentSearchBundle = {
  products: AdminSearchHit[];
  customizations: AdminSearchHit[];
  posts: AdminSearchHit[];
  caseStudies: AdminSearchHit[];
  available: boolean;
  source?: "algolia" | "groq" | "none";
};

const EMPTY: ContentSearchBundle = {
  products: [],
  customizations: [],
  posts: [],
  caseStudies: [],
  available: false,
  source: "none",
};

async function searchContentViaGroq(
  query: string,
): Promise<ContentSearchBundle> {
  const term = matchTerm(query);
  if (!term) return { ...EMPTY, available: Boolean(getAdminSanityClient()) };

  const client = getAdminSanityClient();
  if (!client) return EMPTY;

  const [products, customizations, posts, caseStudies] = await Promise.all([
    client.fetch<ProductHit[]>(PRODUCT_SEARCH, { term }),
    client.fetch<CustomizationHit[]>(CUSTOMIZATION_SEARCH, { term }),
    client.fetch<PostHit[]>(POST_SEARCH, { term }),
    client.fetch<CaseStudyHit[]>(CASE_STUDY_SEARCH, { term }),
  ]);

  return {
    available: true,
    source: "groq",
    products: (products ?? [])
      .filter((p) => p.slug)
      .map((p) => ({
        id: p._id,
        kind: "product" as const,
        title: p.title?.trim() || p.slug!,
        subtitle: [p.shortName, "Product"].filter(Boolean).join(" · "),
        href: wwwPath(`/products/${p.slug}`),
        external: true,
        badge: "Product",
      })),
    customizations: (customizations ?? [])
      .filter((c) => c.slug && c.categorySlug)
      .map((c) => ({
        id: c._id,
        kind: "customization" as const,
        title: c.title?.trim() || c.slug!,
        subtitle: [c.typeTitle, "Customization"].filter(Boolean).join(" · "),
        href: wwwPath(`/customizations/${c.categorySlug}/${c.slug}`),
        external: true,
        badge: "Option",
      })),
    posts: (posts ?? [])
      .filter((p) => p.slug)
      .map((p) => ({
        id: p._id,
        kind: "post" as const,
        title: p.title?.trim() || p.slug!,
        subtitle: [p.categoryTitle, "Blog"].filter(Boolean).join(" · "),
        href: blogPostHref(p.slug!),
        external: true,
        badge: "Post",
      })),
    caseStudies: (caseStudies ?? [])
      .filter((c) => c.slug)
      .map((c) => ({
        id: c._id,
        kind: "caseStudy" as const,
        title: c.title?.trim() || c.slug!,
        subtitle: c.excerpt?.trim() || "Case study",
        href: wwwPath(`/case-studies/${c.slug}`),
        external: true,
        badge: "Case study",
      })),
  };
}

/** Prefer Algolia content_* + posts; fall back to GROQ (ADR-018). */
export async function searchContentCorpus(
  query: string,
): Promise<ContentSearchBundle> {
  const { searchContentViaAlgolia } = await import("./search-content-algolia");
  try {
    const algolia = await searchContentViaAlgolia(query);
    if (algolia.available) return algolia;
  } catch (error) {
    console.error("Algolia content search failed; falling back to GROQ", error);
  }
  return searchContentViaGroq(query);
}
