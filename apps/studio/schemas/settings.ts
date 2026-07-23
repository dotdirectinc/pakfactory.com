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
    { name: 'company', title: 'Company' },
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
      group: 'company',
      description:
        'Company identity — used in the blog header logo and Organization JSON-LD.',
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: 'legalName',
          title: 'Company name',
          type: 'string',
          validation: (Rule) => Rule.required(),
        }),
        defineField(
          taggedImageField({
            name: 'logo',
            title: 'Company logo',
            type: 'image',
            mediaTags: [MEDIA_TAG.website],
            options: { hotspot: true },
            description:
              'Used in the blog header (replaces the default PakFactory wordmark) and Organization JSON-LD.',
            fields: [
              defineField({
                name: 'alt',
                title: 'Alt text override',
                type: 'string',
                description:
                  'Optional. Falls back to the alt text on the image asset.',
              }),
            ],
            validation: (Rule) => Rule.required(),
          }),
        ),
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
    // RFC 9309: robots.txt is per-host, root-only — pakfactory.com/robots.txt is
    // Magento's file and the ONLY one crawlers read (subdirectory copies are
    // ignored). The former `robotsTxt`/`llmsTxt` fields fed per-app routes that
    // were removed for that reason. The root llms.txt is now GENERATED
    // dynamically by apps/www from live content; the two fields below are its
    // only editorial knobs.
    defineField({
      name: 'llmsTxtWww',
      title: 'llms.txt — manual override',
      type: 'text',
      rows: 8,
      group: 'crawlers',
      description:
        'Leave EMPTY for the normal, auto-generated llms.txt (live case studies + blog posts, refreshed hourly). Anything entered here is served verbatim at pakfactory.com/llms.txt instead — emergency/editorial override only.',
    }),
    defineField({
      name: 'llmsTxtStorefront',
      title: 'llms.txt — storefront links (Magento)',
      type: 'text',
      rows: 6,
      group: 'crawlers',
      description:
        'Markdown bullet list of key storefront links (e.g. "- [Custom Boxes](https://pakfactory.com/custom-boxes.html)"). Rendered as the "Products & Packaging" section of the auto-generated llms.txt; section is omitted while empty.',
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
    defineField({
      name: 'additionalEmbedHosts',
      title: 'Additional embed hosts',
      type: 'array',
      group: 'integrations',
      of: [{ type: 'string' }],
      description:
        'Extra domains allowed in the post "Embed" (iframe) widget, on top of the built-in baseline (Zoho, Google Forms/Looker, Typeform, Calendly). Enter a bare host, e.g. "survey.example.com". Admin-managed — this is a security allowlist.',
      validation: (Rule) =>
        Rule.unique().custom((hosts?: string[]) => {
          if (!hosts) return true
          const bad = hosts.find(
            (h) =>
              typeof h !== 'string' ||
              !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(h.trim()),
          )
          return bad
            ? `"${bad}" is not a valid host — use a bare domain like survey.example.com`
            : true
        }),
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Global Settings' }
    },
  },
})
