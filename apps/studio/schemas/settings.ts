import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, ogMediaTags, taggedImageField } from '../lib/media-tags'

/**
 * Global Settings (singleton) — site-wide config shared by every surface
 * (www, blog, …). Per-surface settings (e.g. Blog Settings) override these
 * defaults where set. BA "Global Settings": Identity & brand · SEO defaults ·
 * Social defaults · Crawlers & AI · Integrations.
 *
 * Most of the new fields are consumed in the query/build layer (canonicals,
 * robots, sitemap, JSON-LD Organization, verification tags) — step-2 wiring.
 */
export const settings = defineType({
  name: 'settings',
  title: 'Global Settings',
  type: 'document',
  // Singleton — only one document of this type ever exists.
  groups: [
    { name: 'identity', title: 'Identity & brand', default: true },
    { name: 'seoDefaults', title: 'SEO defaults' },
    { name: 'socialDefaults', title: 'Social defaults' },
    { name: 'crawlers', title: 'Crawlers & AI' },
    { name: 'integrations', title: 'Integrations' },
  ],
  fields: [
    // ── Identity & brand ──────────────────────────────────────────────────────
    defineField({
      name: 'siteTitle',
      title: 'Site name',
      type: 'string',
      group: 'identity',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'siteDescription',
      title: 'Tagline',
      type: 'text',
      rows: 2,
      group: 'identity',
      description: 'Short brand tagline.',
    }),
    defineField({
      name: 'siteBaseUrl',
      title: 'Site base URL',
      type: 'url',
      group: 'identity',
      description:
        'Canonical production domain (e.g. https://www.pakfactory.com). Powers absolute OG-image URLs, canonical tags, and the sitemap base.',
      validation: (Rule) => Rule.required().uri({ scheme: ['https', 'http'] }),
    }),
    defineField({
      name: 'organization',
      title: 'Organization',
      type: 'object',
      group: 'identity',
      description: 'The company Organization entity — emitted as Organization JSON-LD.',
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: 'legalName',
          title: 'Legal name',
          type: 'string',
          validation: (Rule) => Rule.required(),
        }),
        defineField(taggedImageField({
          name: 'logo',
          title: 'Logo',
          type: 'image',
          mediaTags: [MEDIA_TAG.website],
          options: { hotspot: true },
          validation: (Rule) => Rule.required(),
        })),
        defineField({ name: 'foundingDate', title: 'Founding date', type: 'date' }),
        defineField({
          name: 'contact',
          title: 'Contact info',
          type: 'object',
          options: { collapsible: true, collapsed: true },
          fields: [
            defineField({ name: 'email', title: 'Email', type: 'string' }),
            defineField({ name: 'phone', title: 'Phone', type: 'string' }),
            defineField({ name: 'address', title: 'Address', type: 'text', rows: 2 }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'socialLinks',
      title: 'Social profiles',
      type: 'array',
      group: 'identity',
      description: 'Brand social/external profiles → Organization sameAs.',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'platform',
              type: 'string',
              title: 'Platform',
              options: {
                list: ['LinkedIn', 'Twitter/X', 'Instagram', 'YouTube', 'Facebook'],
              },
            },
            { name: 'url', type: 'url', title: 'URL' },
          ],
          preview: { select: { title: 'platform', subtitle: 'url' } },
        },
      ],
    }),
    defineField({
      name: 'primaryCta',
      title: 'Primary CTA',
      type: 'object',
      group: 'identity',
      fields: [
        { name: 'text', type: 'string', title: 'Button text' },
        { name: 'url', type: 'string', title: 'URL or path' },
      ],
    }),

    // ── SEO defaults ──────────────────────────────────────────────────────────
    defineField({
      name: 'defaultMetaTitleFormat',
      title: 'Default meta title format',
      type: 'string',
      group: 'seoDefaults',
      initialValue: '%title% | PakFactory',
      description: 'Token format with branding, e.g. %title% | PakFactory.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'defaultMetaDescriptionFormat',
      title: 'Default meta description format',
      type: 'string',
      group: 'seoDefaults',
      initialValue: '%excerpt%',
      description: 'A single source token (e.g. %excerpt%) — a description is already a full sentence.',
    }),
    defineField({
      name: 'defaultRobots',
      title: 'Default robots directive',
      type: 'object',
      group: 'seoDefaults',
      description:
        'Per-page meta-robots baseline (distinct from robots.txt crawl access). Per-page toggles override it.',
      options: { collapsible: false },
      fields: [
        defineField({ name: 'index', title: 'Index', type: 'boolean', initialValue: true }),
        defineField({ name: 'follow', title: 'Follow', type: 'boolean', initialValue: true }),
        defineField({
          name: 'maxImagePreview',
          title: 'Max image preview',
          type: 'number',
          initialValue: -1,
        }),
        defineField({ name: 'maxSnippet', title: 'Max snippet', type: 'number', initialValue: -1 }),
        defineField({ name: 'maxVideoPreview', title: 'Max video preview', type: 'number', initialValue: -1 }),
      ],
    }),

    // ── Social defaults ───────────────────────────────────────────────────────
    defineField(taggedImageField({
      name: 'defaultOgImage',
      title: 'Default OG image',
      type: 'image',
      group: 'socialDefaults',
      mediaTags: ogMediaTags(MEDIA_TAG.website),
      options: { hotspot: true },
      description: 'Fallback share card when a page has none. 1200×630.',
    })),
    defineField({
      name: 'defaultTwitterCard',
      title: 'Default Twitter card type',
      type: 'string',
      group: 'socialDefaults',
      options: { list: ['summary', 'summary_large_image'] },
      initialValue: 'summary_large_image',
    }),
    defineField({
      name: 'brandTwitterHandle',
      title: 'Brand X/Twitter handle',
      type: 'string',
      group: 'socialDefaults',
      description: 'e.g. @pakfactory — emits twitter:site.',
    }),

    // ── Crawlers & AI ─────────────────────────────────────────────────────────
    defineField({
      name: 'robotsTxt',
      title: 'robots.txt',
      type: 'text',
      rows: 8,
      group: 'crawlers',
      description: 'Crawl access — one file, served at the root.',
    }),
    defineField({
      name: 'llmsTxt',
      title: 'llms.txt',
      type: 'text',
      rows: 8,
      group: 'crawlers',
      description: 'LLM crawl guidance — one file, served at the root.',
    }),
    defineField({
      name: 'aiTrainingDefault',
      title: 'Allow AI training (default)',
      type: 'boolean',
      group: 'crawlers',
      initialValue: true,
    }),
    defineField({
      name: 'aiAnsweringDefault',
      title: 'Allow AI answering (default)',
      type: 'boolean',
      group: 'crawlers',
      initialValue: true,
    }),

    // ── Integrations ──────────────────────────────────────────────────────────
    defineField({
      name: 'gtmId',
      title: 'GTM container ID',
      type: 'string',
      group: 'integrations',
      description: 'e.g. GTM-XXXXXXX',
    }),
    defineField({
      name: 'gscVerification',
      title: 'Google Search Console verification',
      type: 'string',
      group: 'integrations',
    }),
    defineField({
      name: 'bingVerification',
      title: 'Bing / Microsoft verification',
      type: 'string',
      group: 'integrations',
    }),
    defineField({
      name: 'indexNowKey',
      title: 'IndexNow API key',
      type: 'string',
      group: 'integrations',
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Global Settings' }
    },
  },
})
