import { CogIcon } from '@sanity/icons'
import { defineField, defineType } from 'sanity'
import { PAGE_TOKEN_HELP, typeDefaultFields } from '../lib/type-default-fields'

/**
 * Per-type SEO/sitemap default singletons (PROD-2116) — one per blog document type,
 * co-located next to its list in the Blog desk (mirroring `caseStudiesPage`). They
 * hold the same defaults the six-tab `blogSettings` singleton did; the blog resolves
 * each type's defaults as: this singleton -> legacy `blogSettings.<type>Defaults` ->
 * schema initialValue. Values are identical to the old tabs, so output is unchanged
 * once seeded (initial values match `blogSettings`).
 *
 * Fields sit flat under a single `SEO` group (matching the SEO tab convention on the
 * document types), built from the shared `typeDefaultFields` factory with `group: 'seo'`.
 * Each is pinned to a fixed document id in the desk and locked to a single instance
 * via `__experimental_actions: ['update', 'publish']`, exactly like `caseStudiesPage`.
 *
 * Naming note: `topicSettings` is the Topic type's singleton, but the type is still
 * `blogTag` — the blog keeps returning its defaults under the `tagDefaults` key.
 */

const SEO_GROUP = [{ name: 'seo', title: 'SEO', default: true }]
const SINGLETON_ACTIONS: ['update', 'publish'] = ['update', 'publish']

export const postSettings = defineType({
  name: 'postSettings',
  title: 'Post Settings',
  type: 'document',
  icon: CogIcon,
  __experimental_actions: SINGLETON_ACTIONS,
  groups: SEO_GROUP,
  fields: typeDefaultFields({
    group: 'seo',
    metaTitleFormat: '%title%',
    metaDescriptionFormat: '%excerpt%',
    indexDefault: true,
    sitemap: { priority: 0.7, changefreq: 'weekly' },
  }),
  preview: { prepare: () => ({ title: 'Post Settings' }) },
})

export const categorySettings = defineType({
  name: 'categorySettings',
  title: 'Category Settings',
  type: 'document',
  icon: CogIcon,
  __experimental_actions: SINGLETON_ACTIONS,
  groups: SEO_GROUP,
  fields: typeDefaultFields({
    group: 'seo',
    metaTitleFormat: '%name% | PakFactory Blog',
    metaDescriptionFormat: '%description%',
    indexDefault: true,
    sitemap: { priority: 0.8, changefreq: 'weekly' },
  }),
  preview: { prepare: () => ({ title: 'Category Settings' }) },
})

export const topicSettings = defineType({
  name: 'topicSettings',
  title: 'Topic Settings',
  type: 'document',
  icon: CogIcon,
  __experimental_actions: SINGLETON_ACTIONS,
  groups: SEO_GROUP,
  fields: typeDefaultFields({
    group: 'seo',
    metaTitleFormat: '%name% | PakFactory Blog',
    metaDescriptionFormat: '%description%',
    indexDefault: false,
    // topics are noindex by default → no sitemap entry
    extra: [
      defineField({
        name: 'autoNoindexThreshold',
        title: 'Auto-noindex below N posts',
        type: 'number',
        initialValue: 5,
        description:
          'Topic pages with fewer than this many posts are forced noindex, even if an editor enables indexing.',
        validation: (Rule) => Rule.min(0).integer(),
      }),
    ],
  }),
  preview: { prepare: () => ({ title: 'Topic Settings' }) },
})

export const authorSettings = defineType({
  name: 'authorSettings',
  title: 'Author Settings',
  type: 'document',
  icon: CogIcon,
  __experimental_actions: SINGLETON_ACTIONS,
  groups: [
    { name: 'seo', title: 'SEO', default: true },
    { name: 'general', title: 'General' },
  ],
  fields: [
    ...typeDefaultFields({
      group: 'seo',
      metaTitleFormat: '%name%, %job_title% | PakFactory Blog',
      metaDescriptionFormat: '%shortBio%',
      indexDefault: true,
      sitemap: { priority: 0.3, changefreq: 'monthly' },
    }),
    defineField({
      name: 'defaultAuthor',
      title: 'Default author',
      type: 'reference',
      to: [{ type: 'author' }],
      group: 'general',
      description:
        'Fallback author applied to posts with no author assigned — used for the byline, author schema, cards, and RSS.',
    }),
  ],
  preview: { prepare: () => ({ title: 'Author Settings' }) },
})

export const pageSettings = defineType({
  name: 'pageSettings',
  title: 'Page Settings',
  type: 'document',
  icon: CogIcon,
  __experimental_actions: SINGLETON_ACTIONS,
  groups: SEO_GROUP,
  fields: typeDefaultFields({
    group: 'seo',
    tokenHelp: PAGE_TOKEN_HELP,
    metaTitleFormat: '%title% | PakFactory Blog',
    metaDescriptionFormat: '%description%',
    indexDefault: true,
    sitemap: { priority: 0.5, changefreq: 'weekly' },
  }),
  preview: { prepare: () => ({ title: 'Page Settings' }) },
})
