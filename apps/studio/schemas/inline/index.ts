import { bodyBarChart } from './body-bar-chart'
import { bodyCallout } from './body-callout'
import { bodyEmbed } from './body-embed'
import { bodyGallery } from './body-gallery'
import { bodyQuote } from './body-quote'
import { bodyStatStack } from './body-stat-stack'
import { bodyTable } from './body-table'
import { bodyVideo } from './body-video'
import { testimonialBlock } from './testimonial-block'
import { caseStudyGalleryBlock } from './case-study-gallery-block'

/**
 * Inline body blocks — one-off content authored in place inside a post's
 * Portable Text body (distinct from reusable reference widgets in
 * `contentWidget` / `widgetEmbed`). Mirrors apps/blog/src/components/modules/inline/.
 *
 * Add a new inline block: create `schemas/inline/<body-x>.ts`, import it here,
 * and add it to `inlineBlocks`. It auto-registers in the post body `of` array
 * (see schemas/post.ts) and the schema registry (see schemas/index.ts). In the
 * Studio PT editor, inline blocks appear as native toolbar insert buttons (the
 * array insert menu does not yet apply to Portable Text — see Sanity #6992).
 */
export const inlineBlocks = [
  bodyCallout,
  bodyQuote,
  bodyGallery,
  bodyVideo,
  bodyStatStack,
  bodyBarChart,
  bodyTable,
  bodyEmbed,
]

/**
 * Inline blocks for case study Portable Text sections (challenge / solution / result).
 * Kept separate from `inlineBlocks` so they do not appear in the blog post editor.
 * Registered globally in schemas/index.ts so Sanity resolves them in case study PT fields.
 *
 * Uses `bodyImage` (blog's deployed single-image block) for inline images.
 * `testimonialBlock` and `caseStudyGalleryBlock` are case-study-specific.
 */
export const caseStudyInlineBlocks = [testimonialBlock, caseStudyGalleryBlock]
