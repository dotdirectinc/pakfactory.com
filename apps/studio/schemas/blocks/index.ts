import { defineArrayMember, defineType } from 'sanity'

import { postFeaturedRow } from './post-featured-row'
import { postCategoryRow } from './post-category-row'
import { postPopularRow } from './post-popular-row'
import { postSpotlightRow } from './post-spotlight-row'
import { topicStrip } from './topic-strip'
import { featuredVideos } from './featured-videos'
import { ctaNewsletter } from './cta-newsletter'
import { ctaRfq } from './cta-rfq'
import { ctaPillars } from './cta-pillars'
import { ctaSpotlight } from './cta-spotlight'
import { richTextBand } from './rich-text-band'
import { promoBanner } from './promo-banner'
import { pageBuilderPreviewUrl } from './page-builder-preview'

/**
 * Page-builder block schemas. Mirrors apps/blog/src/components/blocks/registry.ts.
 */
export const pageBuilderBlocks = [
  postFeaturedRow,
  postCategoryRow,
  postPopularRow,
  postSpotlightRow,
  topicStrip,
  featuredVideos,
  ctaNewsletter,
  ctaRfq,
  ctaPillars,
  ctaSpotlight,
  richTextBand,
  promoBanner,
]

/** Homepage + topics index blocks (post-driven rows + full CTA set). */
export const homePageBuilderBlocks = [
  postFeaturedRow,
  postCategoryRow,
  postPopularRow,
  postSpotlightRow,
  topicStrip,
  featuredVideos,
  ctaNewsletter,
  ctaRfq,
  ctaPillars,
  ctaSpotlight,
  promoBanner,
]

/** Landing/static allowlist (ADR-009). */
export const landingPageBuilderBlocks = [
  topicStrip,
  ctaNewsletter,
  ctaRfq,
  ctaPillars,
  ctaSpotlight,
  richTextBand,
]

const INSERT_GROUPS_HOME = [
  {
    name: 'post',
    title: 'Post',
    of: ['postFeaturedRow', 'postCategoryRow', 'postPopularRow', 'postSpotlightRow'],
  },
  { name: 'tag', title: 'Topic', of: ['topicStrip'] },
  { name: 'video', title: 'Video', of: ['featuredVideos'] },
  {
    name: 'cta',
    title: 'CTA',
    of: ['ctaNewsletter', 'ctaRfq', 'ctaPillars', 'ctaSpotlight'],
  },
  { name: 'promo', title: 'Promo', of: ['promoBanner'] },
]

const INSERT_GROUPS_LANDING = [
  { name: 'tag', title: 'Topic', of: ['topicStrip'] },
  {
    name: 'cta',
    title: 'CTA',
    of: ['ctaNewsletter', 'ctaRfq', 'ctaPillars', 'ctaSpotlight'],
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
