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

export type SectionProps<T extends PageBuilderSection> = Omit<T, "_type" | "_key">;

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

export type SectionType = keyof typeof SECTION_COMPONENTS;

export const SECTION_TYPES = Object.keys(SECTION_COMPONENTS) as SectionType[];
