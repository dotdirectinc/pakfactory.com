import { bodyCallout } from './body-callout'
import { bodyGallery } from './body-gallery'
import { bodyQuote } from './body-quote'
import { bodyTable } from './body-table'

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
export const inlineBlocks = [bodyCallout, bodyQuote, bodyGallery, bodyTable]
