import { defineArrayMember, defineField, defineType } from 'sanity'
import { DocumentsIcon, HomeIcon } from '@sanity/icons'
import {
  isBlogHomeSingleton,
  isBlogPageSingleton,
  isBlogTopicsSingleton,
  stripDraftId,
} from '../lib/blog-page-singletons'
import { languageField, uniqueSlugPerLanguage } from '../lib/i18n-fields'
import { MEDIA_TAG } from '../lib/media-tags'
import { seoFields, socialFields } from '../lib/seo-fields'

function uniqueTopicGroupRefs(
  items: { _ref?: string }[] | undefined,
): true | string {
  if (!items?.length) return true
  const refs = items.map((item) => item._ref).filter(Boolean) as string[]
  if (new Set(refs).size !== refs.length) {
    return 'Each topic group can only appear once in the list.'
  }
  return true
}

/** Blocked slug values — reserved app segments (keep aligned with @pakfactory/sanity/blog-reserved-slugs). */
const BLOCKED_SLUGS = [
  'all',
  'api',
  'author',
  'contribute',
  'rss.xml',
  'search',
  'sitemap.xml',
  'tag',
] as const

function validateBlogPageSlug(
  slug: { current?: string } | undefined,
  isSingleton: boolean,
) {
  if (isSingleton) return true
  const value = slug?.current?.trim()
  if (!value) return 'Slug is required for landing and static pages'
  if (BLOCKED_SLUGS.includes(value as (typeof BLOCKED_SLUGS)[number])) {
    return `Slug "${value}" is reserved or matches a category archive URL`
  }
  return true
}

export const blogPage = defineType({
  name: 'blogPage',
  title: 'Blog Page',
  type: 'document',
  icon: DocumentsIcon,
  groups: [
    { name: 'overview', title: 'Overview', default: true },
    { name: 'builder', title: 'Page blocks' },
    { name: 'seo', title: 'SEO' },
    { name: 'social', title: 'Social' },
  ],
  fields: [
    defineField(languageField),
    defineField({
      name: 'pageRole',
      title: 'Page role',
      type: 'string',
      group: 'overview',
      options: {
        list: [
          { title: 'Homepage (singleton)', value: 'home' },
          { title: 'Topics index (singleton)', value: 'topics' },
          { title: 'Landing page', value: 'landing' },
          { title: 'Static page', value: 'static' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
      readOnly: ({ document }) => isBlogPageSingleton(document),
      hidden: ({ document }) => isBlogPageSingleton(document),
      initialValue: async (_value, { documentId }) => {
        const id = stripDraftId(documentId)
        if (id === 'blogTopicsPage' || id === 'blogTopicsPage-fr') return 'topics'
        if (id === 'blogHomePage' || id === 'blogHomePage-fr') return 'home'
        return 'landing'
      },
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'overview',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'srHeading',
      title: 'H1 text (visually hidden)',
      type: 'string',
      group: 'overview',
      description:
        'The homepage H1. Rendered visually-hidden (sr-only) for SEO + screen readers, not shown visually. Defaults to the site name when blank.',
      hidden: ({ document }) => !isBlogHomeSingleton(document),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      group: 'overview',
      description:
        'Intro copy shown under the page title on /topics. Separate from the SEO meta description.',
      hidden: ({ document }) => !isBlogTopicsSingleton(document),
    }),
    defineField({
      name: 'topics',
      title: 'Topics',
      type: 'array',
      group: 'overview',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{ type: 'blogTopicGroup' }],
          options: { disableNew: true },
        }),
      ],
      description:
        'Drag to set order on /topics. Only groups listed here appear on the site. New groups are added here automatically when published.',
      hidden: ({ document }) => !isBlogTopicsSingleton(document),
      validation: (Rule) =>
        Rule.custom((items) => uniqueTopicGroupRefs(items as { _ref?: string }[])),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'overview',
      options: { source: 'title', maxLength: 96 },
      description: 'URL path: /{slug}. Not used on homepage or topics singletons.',
      hidden: ({ document }) => isBlogPageSingleton(document),
      validation: (Rule) =>
        Rule.custom(async (slug, context) => {
          const roleCheck = validateBlogPageSlug(
            slug as { current?: string },
            isBlogPageSingleton(context.document),
          )
          if (roleCheck !== true) return roleCheck
          return uniqueSlugPerLanguage('blogPage')(slug as { current?: string }, context)
        }),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published at',
      type: 'datetime',
      group: 'overview',
      description: 'Required before the page is visible on the site or in the sitemap.',
      hidden: ({ document }) => isBlogPageSingleton(document),
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (isBlogPageSingleton(context.document)) return true
          return value ? true : 'Set a publish date before the page goes live'
        }),
    }),
    defineField({
      name: 'pageBuilder',
      title: 'Page blocks',
      type: 'pageBuilderHome',
      group: 'builder',
      description: 'Page-builder blocks (homepage and topics index).',
      hidden: ({ document }) =>
        !isBlogHomeSingleton(document) && !isBlogTopicsSingleton(document),
    }),
    defineField({
      name: 'pageBuilderLanding',
      title: 'Page blocks',
      type: 'pageBuilderLanding',
      group: 'builder',
      description: 'Landing/static block library (CTAs, tag strip, rich text).',
      hidden: ({ document }) => isBlogPageSingleton(document),
    }),
    // ── SEO ───────────────────────────────────────────────────────────────────
    ...seoFields({ group: 'seo' }),

    // ── Social ────────────────────────────────────────────────────────────────
    ...socialFields({ group: 'social', channel: MEDIA_TAG.blog }),
  ],
  preview: {
    select: {
      title: 'title',
      pageRole: 'pageRole',
      slug: 'slug.current',
    },
    prepare({ title, pageRole, slug }) {
      if (pageRole === 'home') {
        return { title: 'Blog Homepage', subtitle: 'Singleton', media: HomeIcon }
      }
      if (pageRole === 'topics') {
        return { title: title || 'Explore topics', subtitle: 'Topics index · /topics' }
      }
      return {
        title: title || 'Untitled page',
        subtitle: [pageRole, slug ? `/${slug}` : ''].filter(Boolean).join(' · '),
      }
    },
  },
})
