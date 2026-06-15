import { defineField, defineType } from 'sanity'
import { UserIcon, EnvelopeIcon, LockIcon, DocumentTextIcon } from '@sanity/icons'
import { MEDIA_TAG, ogMediaTags, taggedImageField } from '../lib/media-tags'

// ─────────────────────────────────────────────────────────────────────────────
// STATIC PAGE SINGLETONS
// One document per page — always the same document ID, no list view.
// Fields can be expanded when PakSpecialist / Academy integration requires
// structured data (e.g. team members array, office location fields).
// ─────────────────────────────────────────────────────────────────────────────

const seoFields = [
  defineField({ name: 'metaTitle', title: 'Meta title', type: 'string', validation: (Rule) => Rule.max(60) }),
  defineField({ name: 'metaDescription', title: 'Meta description', type: 'text', rows: 2, validation: (Rule) => Rule.max(160) }),
  defineField(taggedImageField({
    name: 'ogImage',
    title: 'OG image',
    type: 'image',
    mediaTags: ogMediaTags(MEDIA_TAG.website),
    options: { hotspot: true },
  })),
]

// ── About Us ──────────────────────────────────────────────────────────────────

export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'About Us',
  type: 'document',
  icon: UserIcon,
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      group: 'content',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'subheadline',
      title: 'Subheadline',
      type: 'text',
      rows: 2,
      group: 'content',
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      group: 'content',
      of: [{ type: 'block' }],
    }),
    defineField(taggedImageField({
      name: 'heroImage',
      title: 'Hero image',
      type: 'image',
      group: 'content',
      mediaTags: [MEDIA_TAG.website],
      options: { hotspot: true },
    })),
    ...seoFields.map((f) => ({ ...f, group: 'seo' })),
  ],
  preview: { prepare: () => ({ title: 'About Us' }) },
})

// ── Contact Us ────────────────────────────────────────────────────────────────

export const contactPage = defineType({
  name: 'contactPage',
  title: 'Contact Us',
  type: 'document',
  icon: EnvelopeIcon,
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'headline',
      title: 'Headline',
      type: 'string',
      group: 'content',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Intro text',
      type: 'array',
      group: 'content',
      of: [{ type: 'block' }],
    }),
    defineField({
      name: 'officeAddress',
      title: 'Office address',
      type: 'text',
      rows: 3,
      group: 'content',
    }),
    defineField({
      name: 'email',
      title: 'Contact email',
      type: 'string',
      group: 'content',
    }),
    defineField({
      name: 'phone',
      title: 'Phone number',
      type: 'string',
      group: 'content',
    }),
    ...seoFields.map((f) => ({ ...f, group: 'seo' })),
  ],
  preview: { prepare: () => ({ title: 'Contact Us' }) },
})

// ── Privacy Policy ────────────────────────────────────────────────────────────

export const privacyPolicy = defineType({
  name: 'privacyPolicy',
  title: 'Privacy Policy',
  type: 'document',
  icon: LockIcon,
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'lastUpdated',
      title: 'Last updated',
      type: 'date',
      group: 'content',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Content',
      type: 'array',
      group: 'content',
      of: [{ type: 'block' }],
      validation: (Rule) => Rule.required(),
    }),
    ...seoFields.map((f) => ({ ...f, group: 'seo' })),
  ],
  preview: { prepare: () => ({ title: 'Privacy Policy' }) },
})

// ── Terms of Service ──────────────────────────────────────────────────────────

export const termsOfService = defineType({
  name: 'termsOfService',
  title: 'Terms of Service',
  type: 'document',
  icon: DocumentTextIcon,
  groups: [
    { name: 'content', title: 'Content', default: true },
    { name: 'seo', title: 'SEO' },
  ],
  fields: [
    defineField({
      name: 'lastUpdated',
      title: 'Last updated',
      type: 'date',
      group: 'content',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Content',
      type: 'array',
      group: 'content',
      of: [{ type: 'block' }],
      validation: (Rule) => Rule.required(),
    }),
    ...seoFields.map((f) => ({ ...f, group: 'seo' })),
  ],
  preview: { prepare: () => ({ title: 'Terms of Service' }) },
})
