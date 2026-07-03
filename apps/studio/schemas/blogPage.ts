import { defineField, defineType } from 'sanity'
import { DocumentsIcon, HomeIcon } from '@sanity/icons'
import { languageField, uniqueSlugPerLanguage } from '../lib/i18n-fields'
import { MEDIA_TAG } from '../lib/media-tags'
import { seoFields, socialFields } from '../lib/seo-fields'

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

function validateBlogPageSlug(slug: { current?: string } | undefined, pageRole: string | undefined) {
  if (pageRole === 'home') return true
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
    { name: 'builder', title: 'Page sections' },
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
          { title: 'Landing page', value: 'landing' },
          { title: 'Static page', value: 'static' },
        ],
        layout: 'radio',
      },
      validation: (Rule) => Rule.required(),
      readOnly: ({ document }) => document?.pageRole === 'home',
      hidden: ({ document }) => document?.pageRole === 'home',
      initialValue: 'landing',
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
      hidden: ({ document }) => document?.pageRole !== 'home',
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'overview',
      options: { source: 'title', maxLength: 96 },
      description: 'URL path: /{slug}. Not used on the homepage singleton.',
      hidden: ({ document }) => document?.pageRole === 'home',
      validation: (Rule) =>
        Rule.custom(async (slug, context) => {
          const roleCheck = validateBlogPageSlug(
            slug as { current?: string },
            context.document?.pageRole as string | undefined,
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
      hidden: ({ document }) => document?.pageRole === 'home',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          if (context.document?.pageRole === 'home') return true
          return value ? true : 'Set a publish date before the page goes live'
        }),
    }),
    defineField({
      name: 'pageBuilder',
      title: 'Page sections',
      type: 'pageBuilderHome',
      group: 'builder',
      description: 'Homepage block library (all page-builder blocks).',
      hidden: ({ document }) => document?.pageRole !== 'home',
    }),
    defineField({
      name: 'pageBuilderLanding',
      title: 'Page sections',
      type: 'pageBuilderLanding',
      group: 'builder',
      description: 'Landing/static block library (CTAs, tag strip, rich text).',
      hidden: ({ document }) => document?.pageRole === 'home',
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
      return {
        title: title || 'Untitled page',
        subtitle: [pageRole, slug ? `/${slug}` : ''].filter(Boolean).join(' · '),
      }
    },
  },
})
