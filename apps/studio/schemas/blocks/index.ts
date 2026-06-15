import { defineArrayMember, defineType } from 'sanity'

import { postFeaturedRow } from './post-featured-row'
import { postCategoryRow } from './post-category-row'
import { postSpotlightRow } from './post-spotlight-row'
import { tagStrip } from './tag-strip'
import { ctaNewsletter } from './cta-newsletter'
import { ctaRfq } from './cta-rfq'
import { ctaPillars } from './cta-pillars'
import { richTextBand } from './rich-text-band'
import { pageBuilderPreviewUrl } from './page-builder-preview'

/**
 * Page-builder block schemas. Mirrors apps/blog/src/components/blocks/registry.ts.
 */
export const pageBuilderBlocks = [
  postFeaturedRow,
  postCategoryRow,
  postSpotlightRow,
  tagStrip,
  ctaNewsletter,
  ctaRfq,
  ctaPillars,
  richTextBand,
]

/** Homepage-only blocks (post-driven rows + full CTA set). */
export const homePageBuilderBlocks = [
  postFeaturedRow,
  postCategoryRow,
  postSpotlightRow,
  tagStrip,
  ctaNewsletter,
  ctaRfq,
  ctaPillars,
]

/** Landing/static allowlist (ADR-009). */
export const landingPageBuilderBlocks = [
  tagStrip,
  ctaNewsletter,
  ctaRfq,
  ctaPillars,
  richTextBand,
]

const INSERT_GROUPS_HOME = [
  {
    name: 'post',
    title: 'Post',
    of: ['postFeaturedRow', 'postCategoryRow', 'postSpotlightRow'],
  },
  { name: 'tag', title: 'Tag', of: ['tagStrip'] },
  {
    name: 'cta',
    title: 'CTA',
    of: ['ctaNewsletter', 'ctaRfq', 'ctaPillars'],
  },
]

const INSERT_GROUPS_LANDING = [
  { name: 'tag', title: 'Tag', of: ['tagStrip'] },
  {
    name: 'cta',
    title: 'CTA',
    of: ['ctaNewsletter', 'ctaRfq', 'ctaPillars'],
  },
  { name: 'content', title: 'Content', of: ['richTextBand'] },
]

function insertMenuOptions(
  groups: typeof INSERT_GROUPS_HOME | typeof INSERT_GROUPS_LANDING,
) {
  return {
    filter: 'auto' as const,
    showIcons: true,
    groups,
    views: [
      {
        name: 'grid' as const,
        previewImageUrl: pageBuilderPreviewUrl,
      },
      { name: 'list' as const },
    ],
  }
}

/** @deprecated Use pageBuilderHome or pageBuilderLanding on blogPage. */
export const pageBuilder = defineType({
  name: 'pageBuilder',
  title: 'Page blocks',
  type: 'array',
  of: homePageBuilderBlocks.map(({ name }) => defineArrayMember({ type: name })),
  options: { insertMenu: insertMenuOptions(INSERT_GROUPS_HOME) },
})

export const pageBuilderHome = defineType({
  name: 'pageBuilderHome',
  title: 'Page blocks (home)',
  type: 'array',
  of: homePageBuilderBlocks.map(({ name }) => defineArrayMember({ type: name })),
  options: { insertMenu: insertMenuOptions(INSERT_GROUPS_HOME) },
})

export const pageBuilderLanding = defineType({
  name: 'pageBuilderLanding',
  title: 'Page blocks (landing)',
  type: 'array',
  of: landingPageBuilderBlocks.map(({ name }) => defineArrayMember({ type: name })),
  options: { insertMenu: insertMenuOptions(INSERT_GROUPS_LANDING) },
})
