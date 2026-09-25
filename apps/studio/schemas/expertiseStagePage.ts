import {defineField, defineType} from 'sanity'
import {CheckmarkCircleIcon} from '@sanity/icons'
import {groupsFor, GROUPS} from '../lib/field-groups'
import {pageSectionsField, SECTION_ALLOW} from './sections'

/**
 * Expertise Stage Page — the body template for expertise stage pages (PROD-2577 /
 * PROD-2578). Lives in Main Website → Expertise Pages → Expertise Stage Pages; an
 * `expertiseStage` selects one via its `template` field.
 *
 * Unlike the Solution / Product Line singletons (order + default chrome only,
 * content matched by key on the entity), an Expertise Stage Page owns the WHOLE body:
 * section order, headings and band content. Stages differ by archetype
 * (Consultative, Experiential, …), so there is one template per archetype or
 * stage — e.g. "Packaging Strategy", "Packaging Design".
 *
 * Lists still come from the stage that renders the template (ADR-020 §8): an
 * empty Signature system shows the stage's Services, an empty FAQs section its
 * FAQs, an empty Case study row its featured (else tagged) case studies, and an
 * empty Expertise stages section every stage in hub order. Page-field chips
 * (%h1%, %title%, …) resolve from the stage too, so one template can serve
 * several stages.
 *
 * No URL / SEO — not a routable page; the stage owns hero, SEO and social.
 */
export const expertiseStagePage = defineType({
  name: 'expertiseStagePage',
  title: 'Expertise Stage Page',
  type: 'document',
  icon: CheckmarkCircleIcon,
  groups: groupsFor(['content', 'sections']),
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: GROUPS.content,
      description:
        'Template name shown when a stage picks it (e.g. "Packaging Strategy"). Not shown on the site.',
      validation: (Rule) => Rule.required(),
    }),
    pageSectionsField(
      SECTION_ALLOW.marketPage,
      'sections',
      'The page body for every expertise stage that selects this template, in order. ' +
        'Leave a list empty (Signature system, FAQs, Case study row, Expertise stages) ' +
        'to fill it from the stage.',
    ),
  ],
  preview: {
    select: {title: 'title', sections: 'sections'},
    prepare({title, sections}) {
      const count = Array.isArray(sections) ? sections.length : 0
      return {
        title: title || 'Untitled expertise stage page',
        subtitle: `Stage template · ${count} section(s)`,
      }
    },
  },
})
