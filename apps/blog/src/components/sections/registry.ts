import type { ComponentType } from "react";
import type { PortableTextBlock } from "@portabletext/types";

import type { HomePostCard } from "@/lib/blog-home";
import { CtaNewsletter } from "@/components/sections/cta-newsletter";
import { CtaPillars } from "@/components/sections/cta-pillars";
import { CtaRfq } from "@/components/sections/cta-rfq";
import { PostCategoryRow } from "@/components/sections/post-category-row";
import { PostFeaturedRow } from "@/components/sections/post-featured-row";
import { PostSpotlightRow } from "@/components/sections/post-spotlight-row";
import { RichTextBand } from "@/components/sections/rich-text-band";
import { TagStrip } from "@/components/sections/tag-strip";

/**
 * Page-builder section registry — the single source of truth that maps a
 * Sanity section `_type` to its React component (ADR-008).
 *
 * Each key MUST match the `name` of a Studio section schema under
 * `apps/studio/schemas/sections/<stem>` so the array stays 1:1 with the Studio
 * section list. To add a section, touch exactly three places:
 *   1. Studio: add the `sections/<stem>` section schema (it auto-joins the
 *      `pageBuilder` array via `pageBuilderSections`).
 *   2. Frontend: add the section component in `components/sections/`.
 *   3. Here: add the section type + the `_type → component` entry below.
 *
 * Naming: one prefix-first stem per section (`post` / `cta` / `tag`).
 * `_type` (camelCase) ⇄ file (kebab-case) ⇄ component (PascalCase) are all
 * mechanical transforms of the same stem.
 */

/** One resolved tag pill (from `tags[]->` in the home query). */
export type SectionTagPill = { _id?: string; title: string; slug: string };

/** One pillar card for the `ctaPillars` section. */
export type SectionPillar = {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
};

export type PostFeaturedRowSection = {
  _type: "postFeaturedRow";
  _key: string;
  latestPostsCount?: number;
  featured: HomePostCard | null;
  latest: HomePostCard[];
};

export type PostCategoryRowSection = {
  _type: "postCategoryRow";
  _key: string;
  postsCount?: number;
  categorySlug?: string;
  categoryTitle?: string;
  posts: HomePostCard[];
};

export type PostSpotlightRowSection = {
  _type: "postSpotlightRow";
  _key: string;
  heading?: string;
  posts: HomePostCard[];
};

export type TagStripSection = {
  _type: "tagStrip";
  _key: string;
  heading?: string;
  tags: SectionTagPill[];
};

export type CtaNewsletterSection = {
  _type: "ctaNewsletter";
  _key: string;
  heading?: string;
  body?: string;
};

export type CtaRfqSection = {
  _type: "ctaRfq";
  _key: string;
  heading?: string;
  body?: string;
  ctaHref?: string;
};

export type CtaPillarsSection = {
  _type: "ctaPillars";
  _key: string;
  pillars: SectionPillar[];
};

export type RichTextBandSection = {
  _type: "richTextBand";
  _key: string;
  heading?: string;
  body?: PortableTextBlock[];
};

/** Discriminated union of every page-builder array member. */
export type PageBuilderSection =
  | PostFeaturedRowSection
  | PostCategoryRowSection
  | PostSpotlightRowSection
  | TagStripSection
  | CtaNewsletterSection
  | CtaRfqSection
  | CtaPillarsSection
  | RichTextBandSection;

/**
 * Props a section component receives: its section's content fields without the
 * Sanity envelope (`_type`/`_key`). The renderer spreads the full section in;
 * the extra envelope fields are harmless.
 */
export type SectionProps<T extends PageBuilderSection> = Omit<T, "_type" | "_key">;

/**
 * `_type → component`. Values keep their own section prop types; the
 * `satisfies Record<…, ComponentType<any>>` only guards that every value is a
 * component without widening each component's props.
 */
export const SECTION_COMPONENTS = {
  postFeaturedRow: PostFeaturedRow,
  postCategoryRow: PostCategoryRow,
  postSpotlightRow: PostSpotlightRow,
  tagStrip: TagStrip,
  ctaNewsletter: CtaNewsletter,
  ctaRfq: CtaRfq,
  ctaPillars: CtaPillars,
  richTextBand: RichTextBand,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as const satisfies Record<PageBuilderSection["_type"], ComponentType<any>>;

/** Union of valid section `_type`s, derived from the registry. */
export type SectionType = keyof typeof SECTION_COMPONENTS;

/** Ordered list of registered section types (handy for tests/menus). */
export const SECTION_TYPES = Object.keys(SECTION_COMPONENTS) as SectionType[];
