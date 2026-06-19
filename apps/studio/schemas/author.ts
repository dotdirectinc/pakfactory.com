import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, taggedImageField } from '../lib/media-tags'
import { seoFields, socialFields } from '../lib/seo-fields'

export const author = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  groups: [
    { name: 'profile', title: 'Profile', default: true },
    { name: 'seo', title: 'SEO' },
    { name: 'social', title: 'Social' },
  ],
  fields: [
    // ── Profile ───────────────────────────────────────────────────────────────
    defineField({
      name: 'name',
      title: 'Full name',
      type: 'string',
      group: 'profile',
      description: 'Full name as it appears in bylines (→ Person.name).',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'profile',
      options: { source: 'name' },
      description: 'The profile-page URL: /blog/author/{slug}.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'authorType',
      title: 'Author type',
      type: 'string',
      group: 'profile',
      options: {
        list: [
          { title: 'Staff', value: 'staff' },
          { title: 'Guest', value: 'guest' },
        ],
        layout: 'radio',
      },
      initialValue: 'staff',
      description:
        'Staff → worksFor = PakFactory. Guest → bylined as "Guest contributor"; worksFor is omitted.',
      validation: (Rule) => Rule.required(),
    }),
    defineField(taggedImageField({
      name: 'photo',
      title: 'Photo',
      type: 'image',
      group: 'profile',
      mediaTags: [MEDIA_TAG.blog],
      options: { hotspot: true },
      description: 'Headshot (→ Person.image). Square crop recommended, min 400×400px.',
    })),
    defineField({
      name: 'role',
      title: 'Job title',
      type: 'string',
      group: 'profile',
      description: 'e.g. "Senior Content Writer" (→ Person.jobTitle).',
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      group: 'profile',
      description:
        'One short experience/credibility line under the name, e.g. "10 years covering CPG packaging". Real-only; reconcile with the job title and bio.',
    }),
    defineField({
      name: 'shortBio',
      title: 'Short bio',
      type: 'text',
      rows: 3,
      group: 'profile',
      description: '1–3 sentence intro shown on posts (→ Person.description).',
    }),
    defineField({
      name: 'bio',
      title: 'Long bio',
      type: 'array',
      group: 'profile',
      description:
        'Fuller bio on the profile page. This is where the author’s areas of expertise, background, and any real credentials are written — natural prose, real-only.',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'socialLinks',
      title: 'Social profiles',
      type: 'array',
      group: 'profile',
      description:
        'Social / external profile URLs (LinkedIn, X, personal site, etc.) → Person.sameAs. The main signal that disambiguates the author and links them to external authority.',
      of: [{ type: 'url' }],
      validation: (Rule) => Rule.unique(),
    }),

    // ── SEO ───────────────────────────────────────────────────────────────────
    ...seoFields({ group: 'seo' }),

    // ── Social ────────────────────────────────────────────────────────────────
    ...socialFields({ group: 'social', channel: MEDIA_TAG.blog }),
  ],
  preview: {
    select: { title: 'name', subtitle: 'role', media: 'photo' },
    prepare({ title, subtitle, media }) {
      return { title, subtitle: subtitle || 'No job title set', media }
    },
  },
  orderings: [
    {
      title: 'Name (A–Z)',
      name: 'nameAsc',
      by: [{ field: 'name', direction: 'asc' }],
    },
  ],
})
