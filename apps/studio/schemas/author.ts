import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, taggedImageField } from '../lib/media-tags'

export const author = defineType({
  name: 'author',
  title: 'Author',
  type: 'document',
  groups: [
    { name: 'overview', title: 'Overview', default: true },
    { name: 'credentials', title: 'Credentials' },
  ],
  fields: [
    // ── Overview ────────────────────────────────────────────────────────────
    defineField({
      name: 'name',
      title: 'Full name',
      type: 'string',
      group: 'overview',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'overview',
      options: { source: 'name' },
      description: 'Used in the URL: /blog/author/{slug}',
      validation: (Rule) => Rule.required(),
    }),
    defineField(taggedImageField({
      name: 'photo',
      title: 'Profile photo',
      type: 'image',
      group: 'overview',
      mediaTags: [MEDIA_TAG.blog],
      options: { hotspot: true },
      description: 'Square crop recommended. Min 400×400px.',
    })),
    defineField({
      name: 'role',
      title: 'Title / Role',
      type: 'string',
      group: 'overview',
      description: 'e.g. "Senior Packaging Engineer at PakFactory"',
    }),
    defineField({
      name: 'bio',
      title: 'Bio',
      type: 'array',
      group: 'overview',
      description: '100–200 words. This renders on the author page and in post bylines.',
      of: [{ type: 'block' }],
    }),

    // ── Credentials ──────────────────────────────────────────────────────────
    defineField({
      name: 'credentials',
      title: 'Credentials & experience',
      type: 'array',
      group: 'credentials',
      description:
        'Certifications, past roles, publications, industry experience. Free-form rich text — this feeds the Person schema for E-E-A-T signals.',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'linkedIn',
      title: 'LinkedIn URL',
      type: 'url',
      group: 'credentials',
      description: 'Full URL — e.g. https://linkedin.com/in/jane-doe. Used as sameAs in Person schema.',
      validation: (Rule) =>
        Rule.uri({ scheme: ['https'] }).warning('Should be a full https:// LinkedIn URL'),
    }),
    defineField({
      name: 'personalSite',
      title: 'Personal site URL',
      type: 'url',
      group: 'credentials',
      validation: (Rule) => Rule.uri({ scheme: ['https', 'http'] }),
    }),
    defineField({
      name: 'xHandle',
      title: 'X (Twitter) handle',
      type: 'string',
      group: 'credentials',
      description: 'Handle without @, e.g. "janedoe"',
      validation: (Rule) =>
        Rule.custom((val) => {
          if (!val) return true
          return val.startsWith('@') ? 'Omit the @ — just the handle' : true
        }),
    }),

  ],
  preview: {
    select: { title: 'name', subtitle: 'role', media: 'photo' },
    prepare({ title, subtitle, media }) {
      return { title, subtitle: subtitle || 'No role set', media }
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
