import type { ComponentType } from "react";
import type { PortableTextBlock } from "@portabletext/types";

import type { HomePostCard } from "@/lib/blog-home";
import { CtaNewsletter } from "@/components/blocks/cta-newsletter";
import { CtaPillars } from "@/components/blocks/cta-pillars";
import { CtaRfq } from "@/components/blocks/cta-rfq";
import { PostCategoryRow } from "@/components/blocks/post-category-row";
import { PostFeaturedRow } from "@/components/blocks/post-featured-row";
import { PostSpotlightRow } from "@/components/blocks/post-spotlight-row";
import { RichTextBand } from "@/components/blocks/rich-text-band";
import { TagStrip } from "@/components/blocks/tag-strip";

/**
 * Page-builder block registry — the single source of truth that maps a
 * Sanity block `_type` to its React component (ADR-008).
 *
 * Each key MUST match the `name` of a Studio block schema under
 * `apps/studio/schemas/blocks/<stem>` so the array stays 1:1 with the Studio
 * block list. To add a block, touch exactly three places:
 *   1. Studio: add the `blocks/<stem>` block schema (it auto-joins the
 *      `pageBuilder` array via `pageBuilderBlocks`).
 *   2. Frontend: add the block component in `components/blocks/`.
 *   3. Here: add the block type + the `_type → component` entry below.
 *
 * Naming: one prefix-first stem per block (`post` / `cta` / `tag`).
 * `_type` (camelCase) ⇄ file (kebab-case) ⇄ component (PascalCase) are all
 * mechanical transforms of the same stem.
 */

/** One resolved tag pill (from `tags[]->` in the home query). */
export type BlockTagPill = { _id?: string; title: string; slug: string };

/** One pillar card for the `ctaPillars` block. */
export type BlockPillar = {
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
};

export type PostFeaturedRowBlock = {
  _type: "postFeaturedRow";
  _key: string;
  latestPostsCount?: number;
  featured: HomePostCard | null;
  latest: HomePostCard[];
};

export type PostCategoryRowBlock = {
  _type: "postCategoryRow";
  _key: string;
  postsCount?: number;
  categorySlug?: string;
  categoryTitle?: string;
  posts: HomePostCard[];
};

export type PostSpotlightRowBlock = {
  _type: "postSpotlightRow";
  _key: string;
  heading?: string;
  posts: HomePostCard[];
};

export type TagStripBlock = {
  _type: "tagStrip";
  _key: string;
  heading?: string;
  tags: BlockTagPill[];
};

export type CtaNewsletterBlock = {
  _type: "ctaNewsletter";
  _key: string;
  heading?: string;
  body?: string;
};

export type CtaRfqBlock = {
  _type: "ctaRfq";
  _key: string;
  heading?: string;
  body?: string;
  ctaHref?: string;
};

export type CtaPillarsBlock = {
  _type: "ctaPillars";
  _key: string;
  pillars: BlockPillar[];
};

export type RichTextBandBlock = {
  _type: "richTextBand";
  _key: string;
  heading?: string;
  body?: PortableTextBlock[];
};

/** Discriminated union of every page-builder array member. */
export type PageBuilderBlock =
  | PostFeaturedRowBlock
  | PostCategoryRowBlock
  | PostSpotlightRowBlock
  | TagStripBlock
  | CtaNewsletterBlock
  | CtaRfqBlock
  | CtaPillarsBlock
  | RichTextBandBlock;

/**
 * Props a block component receives: its block's content fields without the
 * Sanity envelope (`_type`/`_key`). The renderer spreads the full block in;
 * the extra envelope fields are harmless.
 */
export type BlockProps<T extends PageBuilderBlock> = Omit<T, "_type" | "_key">;

/**
 * `_type → component`. Values keep their own block prop types; the
 * `satisfies Record<…, ComponentType<any>>` only guards that every value is a
 * component without widening each component's props.
 */
export const BLOCK_COMPONENTS = {
  postFeaturedRow: PostFeaturedRow,
  postCategoryRow: PostCategoryRow,
  postSpotlightRow: PostSpotlightRow,
  tagStrip: TagStrip,
  ctaNewsletter: CtaNewsletter,
  ctaRfq: CtaRfq,
  ctaPillars: CtaPillars,
  richTextBand: RichTextBand,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as const satisfies Record<PageBuilderBlock["_type"], ComponentType<any>>;

/** Union of valid block `_type`s, derived from the registry. */
export type BlockType = keyof typeof BLOCK_COMPONENTS;

/** Ordered list of registered block types (handy for tests/menus). */
export const BLOCK_TYPES = Object.keys(BLOCK_COMPONENTS) as BlockType[];
