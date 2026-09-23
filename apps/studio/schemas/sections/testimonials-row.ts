import { defineType } from 'sanity'
import { CommentIcon } from '@sanity/icons'
import { SectionItemPreview } from '../../components/SectionItemPreview'
import { sectionFieldGroups } from '../../lib/section-field-groups'
import { sectionHeaderFields } from '../../lib/section-header-fields'

/**
 * Reviews — Layout-family carousel of buyer testimonials (ADR-020).
 * Chrome only for now; www still renders mock quotes until a shared
 * `testimonial` document lands (item CMS deferred).
 */
export const testimonialsRow = defineType({
  name: 'testimonialsRow',
  title: 'Reviews',
  type: 'object',
  icon: CommentIcon,
  groups: sectionFieldGroups(),
  fields: [...sectionHeaderFields()],
  preview: {
    select: { title: 'heading' },
    prepare: ({ title }) => ({
      title: title || 'Reviews',
      subtitle: 'Mock quotes until testimonial docs',
    }),
  },
  components: { preview: SectionItemPreview },
})
