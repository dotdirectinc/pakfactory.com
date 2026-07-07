import type { ComponentType } from "react";
import type { PortableTextBlock } from "@portabletext/types";

import type { HomePostCard } from "@/lib/blog-home";
import { CtaNewsletter } from "@/components/blocks/cta-newsletter";
import { CtaPillars } from "@/components/blocks/cta-pillars";
import { CtaRfq } from "@/components/blocks/cta-rfq";
import { PostCategoryRow } from "@/components/blocks/post-category-row";
import { PostFeaturedRow } from "@/components/blocks/post-featured-row";
import { PostPopularRow } from "@/components/blocks/post-popular-row";
import { PostSpotlightRow } from "@/components/blocks/post-spotlight-row";
import { RichTextBand } from "@/components/blocks/rich-text-band";
import { TagStrip } from "@/components/blocks/tag-strip";

/**
 * Page-builder block registry — the single source of truth that maps a
 * Sanity block `_type` to its React component (ADR-008, ADR-012).
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

/** Optional dashed dieline border toggles on full-bleed page-builder blocks. */
export type DielineBorderFields = {
  showTopBorder?: boolean;
  showBottomBorder?: boolean;
};

export type PostFeaturedRowBlock = {
  _type: "postFeaturedRow";
  _key: string;
  latestPostsCount?: number;
  featured: HomePostCard | null;
  latest: HomePostCard[];
} & DielineBorderFields;

export type PostCategoryRowBlock = {
  _type: "postCategoryRow";
  _key: string;
  postsCount?: number;
  categorySlug?: string;
  categoryTitle?: string;
  posts: HomePostCard[];
} & DielineBorderFields;

export type PostPopularRowBlock = {
  _type: "postPopularRow";
  _key: string;
  heading?: string;
  postsCount?: number;
  posts: HomePostCard[];
} & DielineBorderFields;

export type PostSpotlightRowBlock = {
  _type: "postSpotlightRow";
  _key: string;
  heading?: string;
  posts: HomePostCard[];
} & DielineBorderFields;

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
} & DielineBorderFields;

export type CtaRfqBlock = {
  _type: "ctaRfq";
  _key: string;
  heading?: string;
  body?: string;
  ctaHref?: string;
} & DielineBorderFields;

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
  | PostPopularRowBlock
  | PostSpotlightRowBlock
  | TagStripBlock
  | CtaNewsletterBlock
  | CtaRfqBlock
  | CtaPillarsBlock
  | RichTextBandBlock;

export type BlockProps<T extends PageBuilderBlock> = Omit<T, "_type" | "_key">;

export const BLOCK_COMPONENTS = {
  postFeaturedRow: PostFeaturedRow,
  postCategoryRow: PostCategoryRow,
  postPopularRow: PostPopularRow,
  postSpotlightRow: PostSpotlightRow,
  tagStrip: TagStrip,
  ctaNewsletter: CtaNewsletter,
  ctaRfq: CtaRfq,
  ctaPillars: CtaPillars,
  richTextBand: RichTextBand,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
} as const satisfies Record<PageBuilderBlock["_type"], ComponentType<any>>;

export type BlockType = keyof typeof BLOCK_COMPONENTS;

export const BLOCK_TYPES = Object.keys(BLOCK_COMPONENTS) as BlockType[];
