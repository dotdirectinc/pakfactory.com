import { defineField, defineType } from 'sanity'
import { MEDIA_TAG, taggedImageField } from '../lib/media-tags'
import { socialLinksField } from '../lib/social-link-schema'
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
      description: 'Full name as it appears in bylines.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'profile',
      options: { source: 'name' },
      description: 'The profile-page URL: /blog/author/<slug>.',
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
        'Staff authors are credited to PakFactory in structured data. Guest authors are not.',
      validation: (Rule) => Rule.required(),
    }),
    defineField(taggedImageField({
      name: 'photo',
      title: 'Photo',
      type: 'image',
      group: 'profile',
      mediaTags: [MEDIA_TAG.blog],
      options: { hotspot: true },
      description: 'Headshot. Square, at least 800×800px, face centered.',
      validation: (Rule) => Rule.required(),
    })),
    defineField({
      name: 'role',
      title: 'Job title',
      type: 'string',
      group: 'profile',
      description: 'Real role at PakFactory — a few words, up to 50 characters.',
      validation: (Rule) => Rule.required().max(50),
    }),
    defineField({
      name: 'experience',
      title: 'Experience',
      type: 'string',
      group: 'profile',
      description:
        'One number-driven line. For example, "12+ years in packaging engineering · 600+ custom projects shipped".',
    }),
    defineField({
      name: 'shortBio',
      title: 'Short bio',
      type: 'string',
      group: 'profile',
      description:
        'One sidebar line on post pages (≤90 chars). Proof only — name and job title show separately.',
      validation: (Rule) => Rule.required().max(90),
    }),
    defineField({
      name: 'bio',
      title: 'Long bio',
      type: 'array',
      group: 'profile',
      description:
        'Author detail page bio, 120–250 words, third person. Weave in credentials and notable work.',
      of: [{ type: 'block' }],
      validation: (Rule) => Rule.required(),
    }),
    socialLinksField({
      context: 'author',
      group: 'profile',
    }),

    // ── SEO ───────────────────────────────────────────────────────────────────
    ...seoFields({ group: 'seo', typeSettingsId: 'authorSettings' }),

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
