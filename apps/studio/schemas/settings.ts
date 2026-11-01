import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, ogMediaTags, taggedImageField } from '../lib/media-tags'

/**
 * Favicon upload guards (PROD-2200).
 *
 * This is a **file** field, not an image one, because `.ico` is not a supported
 * Sanity image upload format (png/jpg/jpeg/bmp/gif/tiff/svg/psd/webp/heif only)
 * — an `image` field would reject exactly the format most brand kits ship. The
 * cost is that file assets carry no dimensions and are not served through the
 * image-transform pipeline, so the browser gets the uploaded file as-is and
 * validation can only police the extension, read off the asset ref
 * (`file-<hash>-<ext>`) rather than by dereferencing the asset, which
 * validation cannot do synchronously.
 */
const FAVICON_ACCEPT = '.ico,.png,.svg,image/x-icon,image/vnd.microsoft.icon,image/png,image/svg+xml'
const FAVICON_FORMATS = ['ico', 'png', 'svg']

type FileValue = { asset?: { _ref?: string } }

function parseFileExtension(value: unknown) {
  const ref = (value as FileValue | undefined)?.asset?._ref
  const match = ref ? /^file-[^-]+-(\w+)$/.exec(ref) : null
  return match ? match[1].toLowerCase() : null
}

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
    { name: 'identity', title: 'Identity & brand' },
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
      name: 'favicon',
      title: 'Favicon',
      type: 'file',
      group: 'identity',
      options: { accept: FAVICON_ACCEPT },
      description:
        
          'Browser tab and bookmark icon for the website and blog. Accepts .ico, .png or .svg — ' +
          'square, 512×512 for PNG, which is also the iOS touch icon. The file is served ' +
          'exactly as uploaded, so keep it under 50 KB. Leave empty to keep the built-in ' +
          'PakFactory favicon.',
      validation: (Rule) =>
        Rule.custom((value) => {
          const extension = parseFileExtension(value)
          if (!extension) return true
          if (!FAVICON_FORMATS.includes(extension)) {
            return `Favicon must be an .ico, .png or .svg file — this is .${extension}.`
          }
          return true
        }),
    }),
    defineField({
      name: 'organization',
      title: 'Organization',
      type: 'object',
      group: 'company',
      description:
        'The one company record, shared by the main site and the blog — two copies ' +
        'would eventually disagree, and Google would see one company contradicting ' +
        'itself. Feeds the Organization data Google reads, the blog header logo, and ' +
        'the About and Media cards on press releases.',
      options: { collapsible: true, collapsed: false },
      fields: [
        // ⚠️ The key is `legalName` but the value is schema.org `name` — every query
        // maps it that way ("companyName": organization.legalName). If the registered
        // legal entity is ever needed it gets its own field; never put it here. A
        // rename is a dataset migration plus two GROQ queries, so the label and this
        // comment carry the distinction instead (PROD-3231).
        defineField({
          name: 'legalName',
          title: 'Company name',
          type: 'string',
          description:
            'The name the company goes by publicly. Emitted as the organisation name ' +
            "in Google's structured data on every page, and shown in the blog header. " +
            'Use the brand name, not the registered legal entity.',
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
              
                'Shown in the blog header in place of the PakFactory wordmark, and sent ' +
                'to Google as the company logo, where it can appear beside the company ' +
                'name in search results.',
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
        defineField({
          name: 'foundingDate',
          title: 'Founding date',
          type: 'date',
          description:
            'The date PakFactory was founded. Sent to Google as part of the company ' +
            'record — it does not appear anywhere on the site.',
        }),
        // Named `description`, not `boilerplate`: it matches
        // schema.org/Organization.description, which is where it is going
        // anyway, and "boilerplate" is press jargon that means nothing to
        // whoever edits company identity next year. Homed here rather than
        // under the newsroom because the About page and the sitewide
        // Organization structured data both read it — neither should be
        // reading company identity out of a newsroom page's config (PROD-2909).
        //
        // ⚠️ One trade-off, taken knowingly: real newsrooms freeze the
        // boilerplate as published, and one shared field rewrites it on every
        // past release. Nobody maintains twenty frozen copies by hand, and a
        // stale figure on the NEWEST release is worse than drift in the archive.
        defineField({
          name: 'description',
          title: 'Company description',
          type: 'text',
          rows: 4,
          description:
            'The standard "About PakFactory" paragraph, around 60 words. Shown at the foot ' +
            'of every press release for journalists to quote, and sent to Google as the ' +
            'company description. Changing it changes it everywhere, including on past ' +
            'releases. Leave blank to hide the "About" card on releases.',
        }),
        defineField({
          name: 'contact',
          title: 'Contact info',
          type: 'object',
          options: { collapsible: true, collapsed: true },
          fields: [
            defineField({
              name: 'email',
              title: 'Email',
              type: 'string',
              description:
                'The general contact address. Sent to Google as part of the company ' +
                'record. Press enquiries use the field below instead — there is no ' +
                'fallback between the two.',
            }),
            defineField({
              name: 'pressEmail',
              title: 'Media enquiries email',
              type: 'string',
              description:
                'The address for media enquiries, e.g. press@pakfactory.com. Shown in the ' +
                '"Media contact" card at the foot of every release. Leave blank to hide that ' +
                'card — there is no fallback to the general contact email.',
            }),
            defineField({
              name: 'phone',
              title: 'Phone',
              type: 'string',
              description:
                'The main phone number, in international format (+1 …). Sent to Google ' +
                'as part of the company record — it does not appear anywhere on the site.',
            }),
            // 🔴 Retired in favour of `postalAddress` (PROD-3231). A single string
            // cannot be split reliably into the parts a footer, a contact page and
            // schema.org each need separately — `addressCountry` alone wants a
            // two-letter ISO code. Kept and populated per Conventions §4.3: mark
            // deprecated, migrate readers, remove later. Nothing reads it today.
            defineField({
              name: 'address',
              title: 'Address (old, free text)',
              type: 'text',
              rows: 2,
              deprecated: {
                reason:
                  'Replaced by the structured Address below. Copy the parts across; ' +
                  'this field is read by nothing.',
              },
            }),
            defineField({
              name: 'postalAddress',
              title: 'Address',
              type: 'object',
              description:
                'The company address, split into parts so a footer, a contact page and ' +
                'Google can each use the pieces they need. Nothing on the site renders ' +
                'it yet — it is held here ready for when one does.',
              options: { collapsible: true, collapsed: false },
              fields: [
                defineField({
                  name: 'streetAddress',
                  title: 'Street address',
                  type: 'string',
                  description: 'Street, number and unit, e.g. 600 Alden Rd Ste 600.',
                }),
                defineField({
                  name: 'addressLocality',
                  title: 'City',
                  type: 'string',
                }),
                defineField({
                  name: 'addressRegion',
                  title: 'Province / state',
                  type: 'string',
                  description: 'Short form, e.g. ON.',
                }),
                defineField({
                  name: 'postalCode',
                  title: 'Postal code',
                  type: 'string',
                }),
                defineField({
                  name: 'addressCountry',
                  title: 'Country code',
                  type: 'string',
                  description:
                    'Two-letter country code — CA, not Canada. Google expects the code, ' +
                    'and the country name is ignored.',
                  validation: (Rule) =>
                    Rule.uppercase()
                      .length(2)
                      .error('Two letters, e.g. CA'),
                }),
              ],
            }),
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
    defineField({
      name: 'watermark',
      title: 'Image watermark',
      type: 'object',
      group: 'identity',
      description:
        
          'A logo added to images as they are served, on case study and blog post body content ' +
          'only. Originals in Media stay clean. Upload light and dark marks — the site picks by ' +
          'the brightness behind the mark.',
      options: { collapsible: true, collapsed: false },
      fields: [
        defineField({
          name: 'enabled',
          title: 'Enable watermark',
          type: 'boolean',
          initialValue: true,
          description: 'Master switch. When off, no public images show the overlay.',
        }),
        defineField(
          taggedImageField({
            name: 'lightImage',
            title: 'Light watermark (for dark photos)',
            type: 'image',
            mediaTags: [MEDIA_TAG.website],
            description:
              
                'White or light transparent SVG or PNG. Used when the image corner behind the ' +
                'mark is dark.',
          }),
        ),
        defineField(
          taggedImageField({
            name: 'darkImage',
            title: 'Dark watermark (for light photos)',
            type: 'image',
            mediaTags: [MEDIA_TAG.website],
            description:
              'Dark transparent SVG or PNG. Used when the image corner behind the mark is light. Upload both light and dark for best contrast.',
          }),
        ),
        defineField({
          name: 'opacity',
          title: 'Opacity',
          type: 'number',
          initialValue: 0.85,
          description: '0–1. Default 0.85.',
          validation: (Rule) => Rule.min(0).max(1).precision(2),
        }),
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
      description: 'The brand handle (e.g. @pakfactory), used for the twitter:site tag.',
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
        
          'Leave empty for the normal, auto-generated llms.txt (live case studies + blog posts, ' +
          'refreshed hourly). Anything entered here is served verbatim at ' +
          'pakfactory.com/llms.txt instead — emergency/editorial override only.',
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
      description: 'The Google Tag Manager container ID (e.g. GTM-XXXXXXX).',
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
