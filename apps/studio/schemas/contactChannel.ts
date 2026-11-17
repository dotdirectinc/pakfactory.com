import {defineArrayMember, defineField, defineType} from 'sanity'
import {LinkIcon, CommentIcon, EnvelopeIcon} from '@sanity/icons'
import {linkTargetFields} from '../lib/link-target-fields'

/**
 * Contact Page — one row in "Ways to reach us".
 *
 * Every row is the same object: title, line, button label, then an action
 * (Link · Chat · Enquiry). Request a quote is a Link whose site path is the
 * request flow — not a fourth action. Enquiry screens and fields are written
 * by the content team on the same row.
 */

const enquiryFieldMember = defineArrayMember({
  type: 'object',
  name: 'enquiryField',
  title: 'Field',
  fields: [
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      options: {
        layout: 'radio',
        list: [
          {title: 'Short text', value: 'text'},
          {title: 'Email', value: 'email'},
          {title: 'Phone', value: 'tel'},
          {title: 'Long text', value: 'textarea'},
          {title: 'Single choice', value: 'choice'},
        ],
      },
      initialValue: 'text',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'required',
      title: 'Required',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'placeholder',
      title: 'Placeholder',
      type: 'string',
      hidden: ({parent}) => parent?.kind === 'choice',
    }),
    defineField({
      name: 'options',
      title: 'Choices',
      type: 'array',
      description: 'Shown when Kind is Single choice.',
      hidden: ({parent}) => parent?.kind !== 'choice',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'enquiryChoice',
          fields: [
            defineField({
              name: 'value',
              title: 'Value',
              type: 'string',
              description: 'Stored answer key, e.g. delivery.',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'hint',
              title: 'Hint',
              type: 'string',
            }),
          ],
          preview: {
            select: {title: 'label', subtitle: 'value'},
          },
        }),
      ],
      validation: (Rule) =>
        Rule.custom((options, context) => {
          const parent = context.parent as {kind?: string} | undefined
          if (parent?.kind !== 'choice') return true
          if (!Array.isArray(options) || options.length < 1) {
            return 'Add at least one choice.'
          }
          return true
        }),
    }),
  ],
  preview: {
    select: {title: 'label', kind: 'kind', required: 'required'},
    prepare({title, kind, required}) {
      return {
        title: title || 'Field',
        subtitle: [kind, required ? 'required' : 'optional'].filter(Boolean).join(' · '),
      }
    },
  },
})

const enquiryScreenMember = defineArrayMember({
  type: 'object',
  name: 'enquiryScreen',
  title: 'Screen',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'helper',
      title: 'Helper',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'fields',
      title: 'Fields',
      type: 'array',
      of: [enquiryFieldMember],
      validation: (Rule) => Rule.min(1).error('Add at least one field.'),
    }),
  ],
  preview: {
    select: {title: 'heading', fields: 'fields'},
    prepare({title, fields}) {
      return {
        title: title || 'Screen',
        subtitle: `${Array.isArray(fields) ? fields.length : 0} field(s)`,
      }
    },
  },
})

export const contactChannel = defineType({
  name: 'contactChannel',
  title: 'Way to reach us',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'line',
      title: 'Line',
      type: 'text',
      rows: 2,
      description: 'One short description under the title.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'ctaLabel',
      title: 'Button label',
      type: 'string',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'action',
      title: 'Action',
      type: 'string',
      options: {
        layout: 'radio',
        list: [
          {title: 'Link', value: 'link'},
          {title: 'Chat', value: 'chat'},
          {title: 'Enquiry', value: 'enquiry'},
        ],
      },
      initialValue: 'link',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'object',
      description:
        'Internal document, site path (e.g. /request/general for a quote), or external URL.',
      hidden: ({parent}) => parent?.action !== 'link',
      fields: linkTargetFields({
        requireLinkType: true,
        includeSitePath: true,
      }),
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as {action?: string} | undefined
          if (parent?.action !== 'link') return true
          if (!value || typeof value !== 'object') return 'Add a link destination.'
          const link = value as {
            linkType?: string
            internalLink?: unknown
            relativePath?: string
            externalUrl?: string
          }
          if (link.linkType === 'internal' && !link.internalLink) {
            return 'Select a CMS document for internal links.'
          }
          if (link.linkType === 'path' && !link.relativePath?.trim()) {
            return 'Enter a site path, e.g. /request/general.'
          }
          if (link.linkType === 'external' && !link.externalUrl?.trim()) {
            return 'Enter an external URL.'
          }
          if (!link.linkType) return 'Choose a link type.'
          return true
        }),
    }),
    defineField({
      name: 'enquirySlug',
      title: 'Enquiry URL slug',
      type: 'slug',
      description: 'Becomes /contact/<slug>. Must be unique on this page.',
      hidden: ({parent}) => parent?.action !== 'enquiry',
      options: {source: 'title'},
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as {action?: string} | undefined
          if (parent?.action !== 'enquiry') return true
          const current = (value as {current?: string} | undefined)?.current?.trim()
          if (!current) return 'Slug is required for an enquiry.'
          return true
        }),
    }),
    defineField({
      name: 'sendTo',
      title: 'Send to',
      type: 'string',
      description:
        'Stored for a later delivery ticket. This page confirms on screen and does not send yet.',
      hidden: ({parent}) => parent?.action !== 'enquiry',
      options: {
        layout: 'radio',
        list: [
          {title: 'Support', value: 'support'},
          {title: 'Marketing', value: 'marketing'},
          {title: 'Sales', value: 'sales'},
        ],
      },
      initialValue: 'support',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as {action?: string} | undefined
          if (parent?.action !== 'enquiry') return true
          if (!value) return 'Choose where this enquiry is meant to go.'
          return true
        }),
    }),
    defineField({
      name: 'screens',
      title: 'Screens',
      type: 'array',
      description: 'One screen at a time in the enquiry flow.',
      hidden: ({parent}) => parent?.action !== 'enquiry',
      of: [enquiryScreenMember],
      validation: (Rule) =>
        Rule.custom((screens, context) => {
          const parent = context.parent as {action?: string} | undefined
          if (parent?.action !== 'enquiry') return true
          if (!Array.isArray(screens) || screens.length < 1) {
            return 'Add at least one screen.'
          }
          return true
        }),
    }),
    defineField({
      name: 'sendLabel',
      title: 'Send button label',
      type: 'string',
      hidden: ({parent}) => parent?.action !== 'enquiry',
      initialValue: 'Send',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as {action?: string} | undefined
          if (parent?.action !== 'enquiry') return true
          if (!value?.trim()) return 'Send button label is required.'
          return true
        }),
    }),
    defineField({
      name: 'sentTitle',
      title: 'Success title',
      type: 'string',
      hidden: ({parent}) => parent?.action !== 'enquiry',
      initialValue: 'Message sent',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as {action?: string} | undefined
          if (parent?.action !== 'enquiry') return true
          if (!value?.trim()) return 'Success title is required.'
          return true
        }),
    }),
    defineField({
      name: 'sentBody',
      title: 'Success message',
      type: 'text',
      rows: 3,
      hidden: ({parent}) => parent?.action !== 'enquiry',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as {action?: string} | undefined
          if (parent?.action !== 'enquiry') return true
          if (!value?.trim()) return 'Success message is required.'
          return true
        }),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      action: 'action',
      subtitle: 'line',
      slug: 'enquirySlug.current',
    },
    prepare({title, action, subtitle, slug}) {
      const actionLabel =
        action === 'chat' ? 'Chat' : action === 'enquiry' ? `Enquiry · /contact/${slug || '…'}` : 'Link'
      return {
        title: title || 'Way to reach us',
        subtitle: [actionLabel, subtitle].filter(Boolean).join(' — '),
        media:
          action === 'chat' ? CommentIcon : action === 'enquiry' ? EnvelopeIcon : LinkIcon,
      }
    },
  },
})
